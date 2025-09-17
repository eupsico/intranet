// Arquivo: /modulos/financeiro/js/lancamentos.js
// Versão: 2.0
// Descrição: Refatorado para módulo, com estrutura de abas, busca de dados e correção do modal.

export function init(db) {
    if (!db) {
        console.error("Instância do Firestore (db) não encontrada.");
        return;
    }

    const viewContent = document.querySelector('.view-lancamentos');
    if (!viewContent) return;

    const fluxoCaixaRef = db.collection('fluxoCaixa');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    // Elementos do Formulário
    const saveBtn = viewContent.querySelector('#save-lancamento-btn');
    const form = viewContent.querySelector('.lancamentos-form-grid');
    
    // Elementos da Tabela e Filtros
    const tableBody = viewContent.querySelector('#lancamentos-table tbody');
    
    // Elementos do Modal
    const modal = viewContent.querySelector('#confirmation-modal');
    const btnConfirmDelete = viewContent.querySelector('#btn-confirm-delete');
    const btnCancelDelete = viewContent.querySelector('#btn-cancel-delete');
    let lancamentoIdParaExcluir = null;

    let allLancamentos = [];
    let currentFilter = { tipo: 'todos' };

    // --- Funções Utilitárias ---
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (dateString) => {
        if (!dateString) return 'Pendente';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    // --- Lógica das Abas ---
    function setupTabs() {
        const tabContainer = viewContent.querySelector('.tabs-container');
        tabContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-link')) {
                const tabId = e.target.dataset.tab;
                tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                viewContent.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
                viewContent.querySelector(`#${tabId}`).style.display = 'block';
            }
        });
    }

    // --- Lógica da Tabela e Filtros ---
    function setupFilters() {
        const mesSelector = viewContent.querySelector('#filtro-mes');
        const anoSelector = viewContent.querySelector('#filtro-ano');
        const d = new Date();
        const currentMonth = d.getMonth();
        const currentYear = d.getFullYear();
        currentFilter.mes = currentMonth;
        currentFilter.ano = currentYear;

        mesSelector.innerHTML = meses.map((m, i) => `<option value="${i}" ${i === currentMonth ? 'selected' : ''}>${m}</option>`).join('');
        
        let yearsHtml = '';
        for (let y = currentYear - 3; y <= currentYear + 1; y++) {
            yearsHtml += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
        }
        anoSelector.innerHTML = yearsHtml;

        mesSelector.addEventListener('change', (e) => { currentFilter.mes = parseInt(e.target.value); renderTable(); });
        anoSelector.addEventListener('change', (e) => { currentFilter.ano = parseInt(e.target.value); renderTable(); });
        
        viewContent.querySelector('#tipo-filter-buttons').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                viewContent.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter.tipo = e.target.dataset.tipo;
                renderTable();
            }
        });
    }

    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';
        
        const filtered = allLancamentos.filter(l => {
            if (!l.dataVencimento) return false;
            const vencimento = new Date(l.dataVencimento + 'T00:00:00'); // Garante que a data seja lida corretamente
            const matchPeriodo = vencimento.getMonth() === currentFilter.mes && vencimento.getFullYear() === currentFilter.ano;
            const matchTipo = currentFilter.tipo === 'todos' || l.tipo === currentFilter.tipo;
            return matchPeriodo && matchTipo;
        });
        
        filtered.sort((a,b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));

        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">Nenhum lançamento encontrado para este período.</td></tr>';
            return;
        }

        tableBody.innerHTML = filtered.map(l => {
            const tipoClass = l.tipo === 'receita' ? 'text-success' : 'text-danger'; // Usando classes mais semânticas
            return `
                <tr>
                    <td>${formatDate(l.dataVencimento)}</td>
                    <td>${formatDate(l.dataPagamento)}</td>
                    <td>${l.descricao}</td>
                    <td class="${tipoClass}">${l.tipo.charAt(0).toUpperCase() + l.tipo.slice(1)}</td>
                    <td class="${tipoClass}">${formatCurrency(l.valor)}</td>
                    <td><button class="action-button delete-btn" data-id="${l.id}">Excluir</button></td>
                </tr>
            `;
        }).join('');
    }

    // --- Lógica do Formulário ---
    function setupForm() {
        if (!saveBtn) return;
        saveBtn.addEventListener('click', () => {
            const novoLancamento = {
                descricao: viewContent.querySelector('#lancamento-desc').value.trim(),
                valor: parseFloat(viewContent.querySelector('#lancamento-valor').value),
                tipo: viewContent.querySelector('#lancamento-tipo').value,
                categoria: viewContent.querySelector('#lancamento-categoria').value.trim() || 'Geral',
                dataVencimento: viewContent.querySelector('#lancamento-vencimento').value,
                dataPagamento: viewContent.querySelector('#lancamento-pagamento').value || null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            novoLancamento.status = novoLancamento.dataPagamento ? 'pago' : 'pendente';

            if (!novoLancamento.descricao || isNaN(novoLancamento.valor) || novoLancamento.valor <= 0 || !novoLancamento.dataVencimento) {
                window.showToast('Preencha Descrição, Valor e Data de Vencimento.', 'error'); return;
            }

            saveBtn.disabled = true; saveBtn.textContent = 'Salvando...';
            
            fluxoCaixaRef.add(novoLancamento)
                .then(() => {
                    window.showToast('Lançamento salvo com sucesso!', 'success');
                    form.querySelectorAll('input, select').forEach(el => {
                        if(el.type !== 'select-one') el.value = '';
                    });
                    viewContent.querySelector('#lancamento-tipo').value = 'despesa';
                })
                .catch(err => { console.error(err); window.showToast('Erro ao salvar.', 'error'); })
                .finally(() => { saveBtn.disabled = false; saveBtn.textContent = 'Salvar Lançamento'; });
        });
    }

    // --- Lógica do Modal de Exclusão ---
    function setupModalEvents() {
        // Listener na tabela para abrir o modal
        viewContent.querySelector('#lancamentos-table').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                lancamentoIdParaExcluir = e.target.dataset.id;
                modal.classList.add('is-visible'); // Usa classe para controlar visibilidade
            }
        });

        // Listener para fechar o modal
        btnCancelDelete.addEventListener('click', () => {
            modal.classList.remove('is-visible');
            lancamentoIdParaExcluir = null;
        });

        // Listener para confirmar a exclusão
        btnConfirmDelete.addEventListener('click', () => {
            if (lancamentoIdParaExcluir) {
                fluxoCaixaRef.doc(lancamentoIdParaExcluir).delete()
                    .then(() => window.showToast('Lançamento removido com sucesso.', 'success'))
                    .catch(err => window.showToast('Erro ao remover lançamento.', 'error'))
                    .finally(() => {
                        modal.classList.remove('is-visible');
                        lancamentoIdParaExcluir = null;
                    });
            }
        });
        
        // Clicar fora do modal também fecha
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                 modal.classList.remove('is-visible');
                 lancamentoIdParaExcluir = null;
            }
        });
    }

    // --- Ponto de Partida ---
    function start() {
        setupTabs();
        setupFilters();
        setupForm();
        setupModalEvents();

        // Listener em tempo real do Firestore para buscar dados
        fluxoCaixaRef.onSnapshot(snapshot => {
            allLancamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTable();
        }, error => {
            console.error("Erro ao buscar dados do fluxo de caixa: ", error);
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" style="color:red;">Erro ao carregar dados.</td></tr>';
        });
    }

    start();
}