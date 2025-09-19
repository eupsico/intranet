// Função principal que inicializa o portal do voluntário
export function init(db, user) {
    // Busca os dados do usuário no Firestore para obter informações adicionais como nome e funções
    db.collection('usuarios').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            const userData = doc.data();
            // Com os dados do usuário em mãos, monta o menu e carrega a página inicial (dashboard)
            montarMenu(userData, db, user);
            carregarConteudo('dashboard', db, user, userData);
        } else {
            // Trata o caso de não encontrar os dados do usuário
            console.error("Não foi possível encontrar os dados do usuário.");
            document.getElementById('app').innerHTML = '<p class="alert alert-error">Erro ao carregar dados do usuário. Contate o suporte.</p>';
        }
    }).catch(error => {
        // Trata erros na busca pelos dados do usuário
        console.error("Erro ao buscar dados do usuário:", error);
        document.getElementById('app').innerHTML = '<p class="alert alert-error">Ocorreu um erro ao carregar o portal. Tente novamente mais tarde.</p>';
    });
}

// Função para carregar o conteúdo da página selecionada (HTML, CSS e JS)
async function carregarConteudo(pagina, db, user, userData) {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    appContainer.innerHTML = '<div class="loading-spinner"></div>'; // Mostra um spinner de carregamento

    try {
        // Carrega o arquivo HTML da página
        const response = await fetch(`page/${pagina}.html`);
        if (!response.ok) throw new Error(`A página ${pagina}.html não foi encontrada.`);
        appContainer.innerHTML = await response.text();

        // Carrega o módulo JavaScript correspondente à página
        const module = await import(`../js/${pagina}.js`);
        if (module.init) {
            // Inicializa o script da página, passando as instâncias do Firestore e do usuário
            module.init(db, user, userData);
        }

        // Carrega o CSS específico da página, se existir
        carregarCSS(pagina);

    } catch (error) {
        // Trata erros no carregamento da página
        console.error(`Falha ao carregar a página ${pagina}:`, error);
        appContainer.innerHTML = `<p class="alert alert-error">Não foi possível carregar a seção '${pagina}'.</p>`;
    }
}

// Função para injetar dinamicamente o CSS de uma página no <head>
function carregarCSS(pagina) {
    const cssId = `css-${pagina}`;
    // Remove o CSS da página anterior para evitar conflitos de estilo
    document.querySelectorAll('[id^="css-"]').forEach(style => {
        if (style.id !== cssId) style.remove();
    });

    // Verifica se o CSS da página atual já não foi carregado
    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = `css/${pagina}.css`;
        document.head.appendChild(link);
    }
}

// Função para montar o menu lateral de navegação
function montarMenu(userData, db, user) {
    const menuContainer = document.querySelector('.sidebar-nav');
    if (!menuContainer) return;

    // Define a estrutura do menu
    const menuItems = [
        { nome: 'Dashboard', pagina: 'dashboard', icon: 'fa-tachometer-alt' },
        { nome: 'Meu Perfil', pagina: 'meu-perfil', icon: 'fa-user-edit' }, // <<-- ALTERAÇÃO REALIZADA AQUI
        { nome: 'Recursos', pagina: 'recursos', icon: 'fa-book' },
        { nome: 'Solicitações', pagina: 'solicitacoes', icon: 'fa-clipboard-list' },
        { nome: 'Comprovantes', pagina: 'envio_comprovantes', icon: 'fa-file-invoice-dollar' },
    ];

    // Monta o HTML do menu
    let menuHTML = '<ul>';
    menuItems.forEach(item => {
        menuHTML += `<li><a href="#" data-page="${item.pagina}"><i class="fas ${item.icon}"></i> ${item.nome}</a></li>`;
    });

    // Adiciona o item de menu "Gestão" apenas se o usuário tiver a função de "Gestor"
    if (userData && Array.isArray(userData.funcoes) && userData.funcoes.includes('Gestor')) {
        menuHTML += `<li><a href="#" data-page="gestao"><i class="fas fa-users-cog"></i> Gestão</a></li>`;
    }

    menuHTML += '</ul>';
    menuContainer.innerHTML = menuHTML;

    // Adiciona os eventos de clique aos links do menu para carregar as páginas
    menuContainer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const pagina = link.getAttribute('data-page');
            carregarConteudo(pagina, db, user, userData);
        });
    });
}