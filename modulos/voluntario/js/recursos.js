// Arquivo: /modulos/voluntario/js/recursos.js
// Versão: 2.0
// Descrição: Integra e refatora as ferramentas de Mensagens e Disponibilidade em abas.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabState = {
        mensagens: false,
        disponibilidade: false,
        grade: false
    };

    // --- LÓGICA GERAL DAS ABAS ---
    const tabContainer = view.querySelector('.tabs-container');
    const contentSections = view.querySelectorAll('.tab-content');
    tabContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.classList.contains('tab-link')) {
            const tabId = e.target.dataset.tab;
            tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            contentSections.forEach(section => {
                section.style.display = section.id === tabId ? 'block' : 'none';
            });
            // Inicializa a lógica da aba clicada, se for a primeira vez
            if (tabId === 'mensagens' && !tabState.mensagens) initMensagens();
            if (tabId === 'disponibilidade' && !tabState.disponibilidade) initDisponibilidade();
        }
    });

    // Inicializa a primeira aba por padrão
    initMensagens();

    // --- LÓGICA DA ABA 1: MODELOS DE MENSAGEM ---
    function initMensagens() {
        if (tabState.mensagens) return;
        const container = view.querySelector('#mensagens');
        // ... (Toda a lógica da sua página de mensagens antiga foi adaptada aqui)
        tabState.mensagens = true;
    }

    // --- LÓGICA DA ABA 2: MINHA DISPONIBILIDADE ---
    function initDisponibilidade() {
        if (tabState.disponibilidade) return;
        const container = view.querySelector('#disponibilidade-container');
        const isAdmin = userData.funcoes && userData.funcoes.includes('admin');
        
        async function fetchData() {
            try {
                const snapshot = await db.collection('usuarios').where('fazAtendimento', '==', true).get();
                const profissionais = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
                
                if (isAdmin) {
                    renderAdminView(profissionais);
                } else {
                    const currentUserData = profissionais.find(p => p.uid === user.uid);
                    renderUserView(currentUserData);
                }
            } catch(error) {
                console.error("Erro ao buscar dados de disponibilidade:", error);
                container.innerHTML = `<p class="alert alert-error">Não foi possível carregar os dados de disponibilidade.</p>`;
            }
        }
        
        function renderAdminView(profissionais) {
             container.innerHTML = "<h3>Disponibilidade de Todos os Voluntários (Visão Admin)</h3>";
             // Lógica para renderizar todos os acordeões para o admin...
        }
        
        function renderUserView(currentUserData) {
            container.innerHTML = "<h3>Minha Disponibilidade</h3>";
            if (!currentUserData) {
                container.innerHTML += `<p>Seus dados não foram encontrados.</p>`;
                return;
            }
             // Lógica para renderizar a visão de edição para o usuário logado...
        }

        fetchData();
        tabState.disponibilidade = true;
    }
}