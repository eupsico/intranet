// Arquivo: /modulos/financeiro/js/configuracoes.js
// Versão: 1.1
// Descrição: Corrige a lógica de eventos para manter o estado da aba ativa.

export function init(db) {
    if (!db) {
        console.error("Instância do Firestore (db) não encontrada.");
        return;
    }

    const viewContent = document.querySelector('[data-view-id="configuracoes"]');
    if (!viewContent) return;

    const tabButtons = viewContent.querySelectorAll('.tab-link');
    const tabContents = viewContent.querySelectorAll('.tab-content');

    const inicializado = {
        mensagens: false,
        valores: false
    };

    // Função que controla a troca de abas
    function switchTab(targetButton) {
        const tabName = targetButton.dataset.tab;

        // Esconde todos os conteúdos
        tabContents.forEach(content => {
            content.style.display = 'none';
        });

        // Remove 'active' de todos os botões
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Mostra o conteúdo e ativa o botão correspondente
        viewContent.querySelector(`#${tabName}`).style.display = 'block';
        targetButton.classList.add('active');

        // Inicializa a lógica da aba na primeira vez que ela é aberta
        if (tabName === 'ValoresSessao') initValoresSessao();
        else if (tabName === 'ModelosMensagem') initModelosMensagem();
    }

    function initValoresSessao() {
        if (inicializado.valores) return;
        const docRef = db.collection('financeiro').doc('configuracoes');
        const inputOnline = document.getElementById('valor-online');
        const inputPresencial = document.getElementById('valor-presencial');
        const inputTaxa = document.getElementById('taxa-acordo');
        const saveBtn = document.getElementById('salvar-valores-btn');

        async function carregarValores() {
            if (!inputOnline) return;
            try {
                const doc = await docRef.get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data.valores) {
                        inputOnline.value = data.valores.online || 0;
                        inputPresencial.value = data.valores.presencial || 0;
                        inputTaxa.value = data.valores.taxaAcordo || 0;
                    }
                }
            } catch (error) { console.error("Erro ao buscar valores: ", error); window.showToast('Erro ao buscar valores.', 'error'); }
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                saveBtn.disabled = true;
                const dados = { 
                    'valores.online': parseFloat(inputOnline.value) || 0, 
                    'valores.presencial': parseFloat(inputPresencial.value) || 0, 
                    'valores.taxaAcordo': parseFloat(inputTaxa.value) || 0 
                };
                try {
                    await docRef.update(dados);
                    window.showToast('Valores salvos com sucesso!', 'success');
                } catch (error) { 
                    console.error("Erro ao salvar valores: ", error); 
                    window.showToast('Erro ao salvar valores.', 'error');
                } finally { 
                    saveBtn.disabled = false; 
                }
            });
        }
        carregarValores();
        inicializado.valores = true;
    }

    function initModelosMensagem() {
        if (inicializado.mensagens) return;
        const docRef = db.collection('financeiro').doc('configuracoes');
        const inputAcordo = document.getElementById('msg-acordo');
        const inputCobranca = document.getElementById('msg-cobranca');
        const inputContrato = document.getElementById('msg-contrato');
        const saveBtn = document.getElementById('salvar-mensagens-btn');
        let modoEdicao = false;

        function setMensagensState(isEditing) {
            if (!inputAcordo) return;
            modoEdicao = isEditing;
            inputAcordo.disabled = !isEditing;
            inputCobranca.disabled = !isEditing;
            inputContrato.disabled = !isEditing;
            saveBtn.textContent = isEditing ? 'Salvar' : 'Modificar';
        }

        async function carregarMensagens() {
            if (!inputAcordo) return;
            try {
                const doc = await docRef.get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data.Mensagens) {
                       inputAcordo.value = data.Mensagens.acordo || '';
                       inputCobranca.value = data.Mensagens.cobranca || '';
                       inputContrato.value = data.Mensagens.contrato || '';
                    }
                }
            } catch (error) { console.error("Erro ao buscar mensagens: ", error); window.showToast('Erro ao buscar mensagens.', 'error'); }
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (!modoEdicao) { 
                    setMensagensState(true); 
                    return; 
                }
                saveBtn.disabled = true;
                const novasMensagens = { 
                    'Mensagens.acordo': inputAcordo.value, 
                    'Mensagens.cobranca': inputCobranca.value, 
                    'Mensagens.contrato': inputContrato.value 
                };
                try {
                    await docRef.update(novasMensagens);
                    window.showToast('Mensagens salvas com sucesso!', 'success');
                    setMensagensState(false);
                } catch (error) { 
                    console.error("Erro ao salvar mensagens: ", error); 
                    window.showToast('Erro ao salvar mensagens.', 'error');
                } finally { 
                    saveBtn.disabled = false; 
                }
            });
        }

        carregarMensagens();
        setMensagensState(false);
        inicializado.mensagens = true;
    }

    // --- Ponto de Partida do Módulo de Configurações ---
    
    // Adiciona o listener de clique a cada botão de aba
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => switchTab(e.currentTarget));
    });

    // Abre a primeira aba por padrão ao inicializar
    if (tabButtons.length > 0) {
        switchTab(tabButtons[0]);
    }
}