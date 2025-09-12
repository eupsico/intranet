// modules/financeiro/js/gestao_profissionais.js

// Lógica para navegação em abas
const tabLinks = document.querySelectorAll('.tab-link');
const tabContents = document.querySelectorAll('.tab-content');

tabLinks.forEach(link => {
    link.addEventListener('click', () => {
        const tabName = link.dataset.tab;

        // Remove a classe 'active' de todos
        tabLinks.forEach(l => l.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Adiciona a classe 'active' ao link clicado e ao conteúdo correspondente
        link.classList.add('active');
        document.getElementById(tabName).classList.add('active');
    });
});

// Por padrão, ativa a primeira aba
document.querySelector('.tab-link').click();


// TODO: Adicionar aqui a lógica do Firebase para:
// - Carregar a tabela de profissionais
// - Abrir e preencher o modal ao clicar em 'Editar'
// - Abrir o modal em branco ao clicar em 'Adicionar'
// - Salvar, editar e excluir profissionais