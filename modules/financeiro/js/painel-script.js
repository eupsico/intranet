// modules/financeiro/js/painel-script.js (Versão Final Sincronizada)

(function() {
    console.log("Painel Script carregado. Aguardando sinal 'userReady'...");

    // Ouve pelo evento customizado 'userReady' que o main.js dispara
    document.addEventListener('userReady', function(event) {
        console.log("Sinal 'userReady' recebido. Inicializando painel do módulo...");

        // Pega os dados do usuário que o main.js enviou
        const { user, userData } = event.detail;
        
        // Constantes do Firebase já estão disponíveis globalmente
        const db = firebase.firestore();
        
        const contentArea = document.getElementById('content-area');
        const navButtons = document.querySelectorAll('.sidebar-menu .nav-button');

        /**
         * Mostra ou esconde os botões do menu com base nas funções do usuário.
         */
        function gerenciarPermissoesMenu(funcoesUsuario = []) {
            navButtons.forEach(button => {
                const itemDoMenu = button.closest('li');
                if (!itemDoMenu) return;

                const rolesNecessarias = button.dataset.roles ? button.dataset.roles.split(',') : [];
                const temPermissao = rolesNecessarias.length === 0 || 
                                     funcoesUsuario.includes('admin') || 
                                     rolesNecessarias.some(role => funcoesUsuario.includes(role.trim()));
                
                itemDoMenu.style.display = temPermissao ? 'block' : 'none';
            });
        }

        /**
         * Carrega o conteúdo de uma sub-página (view) dentro da área principal.
         */
        async function loadView(viewName) {
            navButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === viewName);
            });
            
            const oldScript = document.getElementById('dynamic-view-script');
            if (oldScript) oldScript.remove();
            const oldStyle = document.getElementById('dynamic-view-style');
            if (oldStyle) oldStyle.remove();
            
            try {
                contentArea.innerHTML = '<div class="loading-spinner">Carregando...</div>';
                
                const response = await fetch(`./${viewName}.html`);
                if (!response.ok) throw new Error(`Arquivo não encontrado: ${viewName}.html`);
                contentArea.innerHTML = await response.text();

                const stylePath = `../css/${viewName}.css`;
                fetch(stylePath).then(res => {
                    if (res.ok) {
                        const newStyle = document.createElement('link');
                        newStyle.id = 'dynamic-view-style';
                        newStyle.rel = 'stylesheet';
                        newStyle.href = stylePath;
                        document.head.appendChild(newStyle);
                    }
                });

                const scriptPath = `../js/${viewName}.js`;
                fetch(scriptPath).then(res => {
                    if (res.ok) {
                        const newScript = document.createElement('script');
                        newScript.id = 'dynamic-view-script';
                        newScript.src = scriptPath;
                        newScript.type = 'module';
                        document.body.appendChild(newScript);
                    }
                });

            } catch (error) {
                console.error(`Erro ao carregar a view ${viewName}:`, error);
                contentArea.innerHTML = `<div class="view-container"><h2>Módulo em Desenvolvimento</h2><p>O conteúdo para a seção '${viewName}' ainda não foi criado.</p></div>`;
            }
        }
        
        /**
         * Função que inicializa o painel do módulo.
         */
        function initializePanel() {
            const funcoes = userData.funcoes || [];
            gerenciarPermissoesMenu(funcoes);

            const hash = window.location.hash.substring(1);
            const requestedButton = document.querySelector(`.sidebar-menu .nav-button[data-view="${hash}"]`);
            
            const isButtonVisible = requestedButton && requestedButton.closest('li').style.display !== 'none';

            if (hash && isButtonVisible) {
                loadView(hash);
            } else {
                loadView('dashboard');
            }

            window.addEventListener('hashchange', () => {
                const viewName = window.location.hash.substring(1) || 'dashboard';
                loadView(viewName);
            });

            navButtons.forEach(button => {
                if (button.tagName === 'BUTTON') {
                    button.addEventListener('click', (e) => {
                        window.location.hash = e.currentTarget.dataset.view;
                    });
                }
            });
        }

        // Inicia o painel do módulo, agora com a certeza de que os dados do usuário estão prontos.
        initializePanel();
    });
})();