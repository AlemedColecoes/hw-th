(function () {
  'use strict';
  const h = React.createElement;
  const { useState, useEffect, useMemo, useCallback } = React;
  const catalog = window.initialMiniaturesByYear;
  const TABLE = window.SUPABASE_TABLE || 'colecao_hotwheels_thunt';
  const configMissing = !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY ||
    window.SUPABASE_URL.includes('COLE_AQUI') || window.SUPABASE_ANON_KEY.includes('COLE_AQUI');
  const supabase = !configMissing && window.supabase
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

  function rowsToCollection(rows) {
    const result = {};
    (rows || []).forEach(row => {
      const year = String(row.year), category = row.category, id = String(row.mini_id);
      if (!result[year]) result[year] = {};
      if (!result[year][category]) result[year][category] = {};
      result[year][category][id] = true;
    });
    return result;
  }

  function App() {
    const [session, setSession] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [busy, setBusy] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [collection, setCollection] = useState({});
    const [loadingCollection, setLoadingCollection] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');

    const orderedYears = useMemo(() => Object.keys(catalog).map(Number).sort((a,b)=>b-a).map(String), []);

    const yearsStats = useMemo(() => {
      let totalAvailable=0,totalCollected=0;
      Object.keys(catalog).forEach(year=>{
        ['super','regular'].forEach(type=>{
          const minis=catalog[year][type]||[];
          totalAvailable+=minis.length;
          totalCollected+=minis.filter(m=>collection[year]?.[type]?.[String(m.id)]).length;
        });
      });
      return {totalAvailable,totalCollected};
    },[collection]);

    useEffect(()=>{
      const pop=event=>{
        if (!window.location.hash || !event.state) setSelectedYear(null);
        else if(event.state.year && event.state.type) setSelectedYear({year:event.state.year,type:event.state.type});
      };
      const match=window.location.hash.match(/^#(\d{4})-(super|regular)$/);
      if(match){setSelectedYear({year:match[1],type:match[2]});window.history.replaceState({year:match[1],type:match[2]},'','#'+match[1]+'-'+match[2]);}
      else window.history.replaceState(null,'',window.location.pathname);
      window.addEventListener('popstate',pop);
      return ()=>window.removeEventListener('popstate',pop);
    },[]);

    const loadCollection = useCallback(async (userId) => {
      if (!supabase || !userId) return;
      setLoadingCollection(true);
      const { data, error } = await supabase.from(TABLE)
        .select('year, category, mini_id').eq('user_id', userId);
      if (error) setSyncMessage('Não foi possível carregar a coleção: ' + error.message);
      else { setCollection(rowsToCollection(data)); setSyncMessage('Coleção sincronizada'); }
      setLoadingCollection(false);
    }, []);

    useEffect(() => {
      if (!supabase) { setAuthReady(true); return; }
      let alive = true;
      supabase.auth.getSession().then(({ data }) => {
        if (!alive) return;
        setSession(data.session);
        setAuthReady(true);
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setCollection({});
        setSelectedYear(null);
      });
      return () => { alive = false; listener.subscription.unsubscribe(); };
    }, []);

    useEffect(() => {
      if (!session?.user?.id) return;
      loadCollection(session.user.id);
      const channel = supabase.channel('thunt-collection-' + session.user.id)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: TABLE,
          filter: 'user_id=eq.' + session.user.id
        }, () => loadCollection(session.user.id))
        .subscribe();
      const refresh = () => loadCollection(session.user.id);
      window.addEventListener('focus', refresh);
      return () => {
        window.removeEventListener('focus', refresh);
        supabase.removeChannel(channel);
      };
    }, [session?.user?.id, loadCollection]);

    const signIn = async (event) => {
      event.preventDefault();
      if (!supabase) return;
      setBusy(true); setAuthError('');
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setAuthError('Não foi possível entrar: ' + error.message);
      setBusy(false);
    };

    const signOut = async () => {
      if (supabase) await supabase.auth.signOut();
      setCollection({}); setSelectedYear(null);
    };

    const toggleMiniature = async (year, category, id) => {
      if (!session?.user?.id || busy) return;
      const key = String(id);
      const wasOwned = !!(collection[year]?.[category]?.[key]);
      const next = JSON.parse(JSON.stringify(collection));
      if (!next[year]) next[year] = {};
      if (!next[year][category]) next[year][category] = {};
      if (wasOwned) delete next[year][category][key];
      else next[year][category][key] = true;
      if (!Object.keys(next[year][category]).length) delete next[year][category];
      if (!Object.keys(next[year]).length) delete next[year];
      setCollection(next);
      setBusy(true);
      setSyncMessage('Salvando…');
      const match = { user_id: session.user.id, year: String(year), category, mini_id: Number(id) };
      const result = wasOwned
        ? await supabase.from(TABLE).delete().match(match)
        : await supabase.from(TABLE).upsert(match, { onConflict: 'user_id,year,category,mini_id' });
      if (result.error) {
        setSyncMessage('Erro ao salvar: ' + result.error.message);
        await loadCollection(session.user.id);
      } else setSyncMessage('Salvo e sincronizado');
      setBusy(false);
    };

    if (configMissing) return h('div', {className:'min-h-screen flex items-center justify-center p-5'},
      h('div',{className:'bg-white rounded-xl shadow-xl p-6 max-w-xl w-full'},
        h('h1',{className:'text-2xl font-bold mb-3'},'Configuração do Supabase pendente'),
        h('p',{className:'text-gray-700'},'Abra js/supabase-config.js e informe a URL e a chave pública (anon) do seu projeto Supabase. Depois publique os arquivos no GitHub.')));

    if (!authReady) return h('div',{className:'min-h-screen flex items-center justify-center'},'Carregando…');
    if (!session) return h('div',{className:'min-h-screen flex items-center justify-center p-4 app-bg'},
      h('form',{onSubmit:signIn,className:'bg-black/80 text-white rounded-2xl p-7 w-full max-w-md shadow-2xl'},
        h('h1',{className:'text-3xl font-extrabold text-purple-300 mb-2 text-center'},'Hot Wheels T-Hunt'),
        h('p',{className:'text-gray-300 text-center mb-6'},'Entre para acessar e sincronizar sua coleção.'),
        h('label',{className:'block text-sm mb-1'},'E-mail'),
        h('input',{type:'email',required:true,value:email,onChange:e=>setEmail(e.target.value),autoComplete:'username',className:'w-full rounded-lg p-3 text-gray-900 mb-4'}),
        h('label',{className:'block text-sm mb-1'},'Senha'),
        h('input',{type:'password',required:true,value:password,onChange:e=>setPassword(e.target.value),autoComplete:'current-password',className:'w-full rounded-lg p-3 text-gray-900 mb-4'}),
        authError && h('p',{className:'text-red-300 text-sm mb-3'},authError),
        h('button',{disabled:busy,className:'w-full bg-purple-600 hover:bg-purple-700 rounded-lg p-3 font-bold'},busy?'Entrando…':'Entrar'),
        h('p',{className:'text-xs text-gray-400 mt-4 text-center'},'Use o mesmo e-mail e senha da sua conta Supabase.')));

    const navigateToYear = (year,type) => {
      window.history.pushState({year,type},'','#'+year+'-'+type);
      setSelectedYear({year,type});
    };
    const goBack = () => { window.history.back(); };
    const header = h('div',{className:'w-full flex flex-wrap items-center justify-between gap-2 mb-4 text-xs text-gray-200'},
      h('span',null,session.user.email),
      h('span',null,loadingCollection?'Atualizando coleção…':syncMessage),
      h('button',{onClick:signOut,className:'bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2'},'Sair'));

    if (!selectedYear) return h('div',{className:'min-h-screen app-bg flex flex-col items-center justify-start text-white p-3 sm:p-4'},
      h('div',{className:'app-panel relative bg-black/75 w-full flex flex-col items-center justify-start p-5 sm:p-6 rounded-xl max-w-6xl mx-auto shadow-2xl min-h-[95vh]'},
        header,
        h('div',{className:'w-full text-center mt-3'},
          h('h1',{className:'app-title text-4xl font-extrabold mb-4 text-purple-300'},'Coleção Hot Wheels T-Hunt'),
          h('div',{className:'bg-white/15 border border-white/25 rounded-lg p-4 text-white w-full max-w-sm mx-auto my-4'},
            h('h3',{className:'font-bold mb-3 text-purple-200'},'Resumo da Coleção'),
            h('div',{className:'flex justify-between text-sm'},h('span',null,'Minis cadastradas:'),h('b',null,yearsStats.totalAvailable)),
            h('div',{className:'flex justify-between text-sm mt-2'},h('span',null,'Minis que tenho:'),h('b',{className:'text-green-300'},yearsStats.totalCollected)) ),
          h('p',{className:'mb-7 text-center text-gray-300 max-w-lg mx-auto'},'Selecione o ano e a categoria para visualizar sua coleção.')),
        h('div',{className:'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-4xl'},
          orderedYears.map(year=>{
            const yd=catalog[year], yc=collection[year]||{}, old=Number(year)>=1995&&Number(year)<=2006;
            const sc=(yd.super||[]).length, rc=(yd.regular||[]).length;
            const so=(yd.super||[]).filter(m=>yc.super?.[String(m.id)]).length;
            const ro=(yd.regular||[]).filter(m=>yc.regular?.[String(m.id)]).length;
            return h('div',{key:year,className:'bg-white/20 border border-white/30 rounded-xl p-4 shadow-xl text-white flex flex-col items-center'},
              h('h2',{className:'text-2xl font-bold mb-3 text-purple-200'},year),
              h('div',{className:'space-y-3 w-full'},
                h('button',{onClick:()=>navigateToYear(year,'super'),className:'w-full bg-yellow-200 hover:bg-yellow-400 text-black rounded-lg py-3 text-sm font-semibold flex flex-col items-center'},h('span',{className:'text-lg'},'SUPER T-HUNT'),h('span',{className:'font-bold'},so+' / '+sc)),
                !old&&h('button',{onClick:()=>navigateToYear(year,'regular'),className:'w-full bg-gray-300 hover:bg-gray-400 text-black rounded-lg py-3 text-sm font-semibold flex flex-col items-center'},h('span',{className:'text-lg'},'REGULAR T-HUNT'),h('span',{className:'font-bold'},ro+' / '+rc))));
          }))));

    const year=selectedYear.year,type=selectedYear.type;
    const minis=(catalog[year]&&catalog[year][type])||[];
    const current=collection[year]?.[type]||{};
    return h('div',{className:'min-h-screen app-bg flex flex-col items-center justify-start text-white p-3 sm:p-4'},
      h('div',{className:'app-panel bg-black/75 w-full p-5 sm:p-6 rounded-xl max-w-6xl mx-auto shadow-2xl min-h-[95vh]'},
        header,
        h('button',{onClick:goBack,className:'bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg mb-5'},'← Voltar'),
        h('h1',{className:'app-title text-3xl sm:text-4xl font-extrabold text-center mb-6 text-purple-300'},(type==='super'?'T-HUNT SUPER':'T-HUNT REGULAR')+' - '+year),
        h('div',{className:'mini-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full'},
          minis.map(mini=>{
            const owned=!!current[String(mini.id)];
            return h('div',{key:mini.id,className:'mini-card card bg-white rounded-lg shadow-lg p-3 flex flex-col items-center '+(owned?'collected-card':'border-4 border-transparent')},
              h('div',{className:'mini-image w-full bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center mb-2'},
                h('img',{src:mini.image||'https://via.placeholder.com/150',alt:mini.name,className:'object-contain w-full h-full',onError:e=>{e.currentTarget.onerror=null;e.currentTarget.src='https://via.placeholder.com/266x333?text=IMAGEM+NAO+ENCONTRADA';}})),
              h('p',{className:'text-gray-800 text-xs sm:text-sm font-semibold text-center mt-1 mb-2'},mini.name||'A definir'),
              h('label',{className:'flex items-center justify-center gap-2 text-gray-800 text-sm font-medium cursor-pointer py-1'},
                h('input',{type:'checkbox',checked:owned,onChange:()=>toggleMiniature(year,type,mini.id),className:'w-5 h-5 accent-green-600'}),'Tenho'));
          }))));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
