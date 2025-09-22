// eupsico/intranet/modulos/voluntario/js/fichas-preenchidas.js

let db, user, userData;
let todasAsFichas = [];

export function init(dbRef, userRef, userDataRef) {
    // Usamos um setTimeout para garantir que as referências globais estejam prontas
    setTimeout(() => {
        db = dbRef;
        user = userRef;
        userData = userDataRef;
        carregarFichas();
    }, 0);
}

/**
 * Carrega as fichas do psicólogo logado a partir do Firestore.
 */
async function carregarFichas() {
    const container = document.getElementById('lista-fichas-container');
    if (!container) {
        console.error("Container #lista-fichas-container não encontrado.");
        return;
    }
    container.innerHTML = '<div class="loading-spinner"></div>'; // Mostra o spinner de carregamento

    try {
        const q = db.collection("fichas-supervisao-casos").where("psicologoUid", "==", user.uid);
        const querySnapshot = await q.get();
        todasAsFichas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Ordena as fichas pela data de criação, da mais recente para a mais antiga
        if (todasAsFichas.length > 0) {
            todasAsFichas.sort((a, b) => (b.criadoEm?.toDate() || 0) - (a.criadoEm?.toDate() || 0));
        }

        renderizarLista(todasAsFichas);
        popularFiltroPacientes(todasAsFichas);
        document.getElementById('filtro-paciente').addEventListener('change', aplicarFiltro);

    } catch (error) {
        console.error("Erro ao carregar fichas:", error);
        container.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao buscar seus acompanhamentos.</p>';
    }
}

/**
 * Renderiza a lista de fichas na tela.
 * @param {Array} fichas - O array de fichas a ser renderizado.
 */
function renderizarLista(fichas) {
    const container = document.getElementById('lista-fichas-container');
    container.innerHTML = ''; // Limpa o container

    if (fichas.length === 0) {
        container.innerHTML = '<p class="no-fichas-message">Nenhum acompanhamento encontrado.</p>';
        return;
    }

    fichas.forEach(ficha => {
        const dataFormatada = ficha.identificacaoGeral.dataSupervisao 
            ? new Date(ficha.identificacaoGeral.dataSupervisao + 'T00:00:00').toLocaleDateString('pt-BR') 
            : 'N/D';
        
        const itemEl = document.createElement('div');
        itemEl.className = 'ficha-item';
        itemEl.innerHTML = `
            <div class="ficha-item-col"><p class="label">Paciente</p><p class="value paciente">${ficha.identificacaoCaso.iniciais || 'N/A'}</p></div>
            <div class="ficha-item-col"><p class="label">Supervisor(a)</p><p class="value">${ficha.identificacaoGeral.supervisorNome || 'N/A'}</p></div>
            <div class="ficha-item-col"><p class="label">Data da Supervisão</p><p class="value">${dataFormatada}</p></div>
        `;
        
        // CORREÇÃO PRINCIPAL: Adiciona um evento de clique que redireciona para a página de edição.
        // A página do formulário (`ficha-supervisao.html`) será responsável por carregar os dados.
        itemEl.addEventListener('click', () => abrirFichaParaEdicao(ficha.id));
        
        container.appendChild(itemEl);
    });
}

/**
 * Redireciona o usuário para a página do formulário, passando o ID da ficha na URL.
 * @param {string} docId - O ID do documento da ficha no Firestore.
 */
function abrirFichaParaEdicao(docId) {
    // Assumindo que a página do formulário se chama 'ficha-supervisao.html'
    // Se o nome for diferente, ajuste aqui.
    window.location.href = `ficha-supervisao.html?id=${docId}`;
}

/**
 * Popula o dropdown de filtro com as iniciais dos pacientes.
 * @param {Array} fichas - O array de todas as fichas.
 */
function popularFiltroPacientes(fichas) {
    const filtroSelect = document.getElementById('filtro-paciente');
    if (!filtroSelect) return;

    const iniciais = [...new Set(fichas.map(f => f.identificacaoCaso.iniciais))].sort();
    filtroSelect.innerHTML = '<option value="todos">Todos os Pacientes</option>';
    iniciais.forEach(i => {
        if (i) filtroSelect.innerHTML += `<option value="${i}">${i}</option>`;
    });
}

/**
 * Aplica o filtro de paciente selecionado na lista de fichas.
 */
function aplicarFiltro() {
    const valor = document.getElementById('filtro-paciente').value;
    const fichasFiltradas = (valor === 'todos') 
        ? todasAsFichas 
        : todasAsFichas.filter(f => f.identificacaoCaso.iniciais === valor);
    renderizarLista(fichasFiltradas);
}