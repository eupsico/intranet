// Arquivo: /modulos/voluntario/js/meus-supervisionados-view.js
// Descrição: Controla a aba "Meus Supervisionados", listando as fichas e permitindo a edição.

export async function init(db, user, userData) {
    const listaView = document.getElementById('supervisionados-lista-view');
    const formView = document.getElementById('supervisionados-form-view');
    const listaContainer = document.getElementById('lista-fichas-container');

    if (!listaView || !formView || !listaContainer) {
        console.error("Componentes da aba 'Meus Supervisionados' não encontrados.");
        return;
    }

    // Função para alternar entre a visão da lista e a do formulário
    function alternarVisao(mostrar) {
        if (mostrar === 'lista') {
            listaView.style.display = 'block';
            formView.style.display = 'none';
            formView.innerHTML = ''; // Limpa o formulário ao voltar
        } else {
            listaView.style.display = 'none';
            formView.style.display = 'block';
        }
    }

    // Renderiza a lista de fichas encontradas
    function renderizarLista(fichas) {
        listaContainer.innerHTML = '';
        if (fichas.length === 0) {
            listaContainer.innerHTML = '<p class="no-fichas-message">Nenhuma ficha de supervisão encontrada para você.</p>';
            return;
        }

        fichas.forEach(ficha => {
            const dataFormatada = ficha.identificacaoGeral?.dataSupervisao 
                ? new Date(ficha.identificacaoGeral.dataSupervisao + 'T00:00:00').toLocaleDateString('pt-BR') 
                : 'N/D';
            
            const itemEl = document.createElement('div');
            itemEl.className = 'ficha-item'; // Reutiliza o estilo de 'fichas-preenchidas.css'
            itemEl.innerHTML = `
                <div class="ficha-item-col"><p class="label">Paciente</p><p class="value paciente">${ficha.identificacaoCaso?.iniciais || 'N/A'}</p></div>
                <div class="ficha-item-col"><p class="label">Psicólogo(a)</p><p class="value">${ficha.psicologoNome || 'N/A'}</p></div>
                <div class="ficha-item-col"><p class="label">Data da Supervisão</p><p class="value">${dataFormatada}</p></div>
            `;
            itemEl.addEventListener('click', () => abrirFormularioParaEdicao(ficha.id));
            listaContainer.appendChild(itemEl);
        });
    }

    // Carrega o HTML do formulário, preenche com os dados e ativa o autosave
    async function abrirFormularioParaEdicao(docId) {
        alternarVisao('form');
        formView.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const response = await fetch('../page/editar-ficha.html');
            if (!response.ok) throw new Error('Falha ao carregar o HTML do formulário de edição.');
            formView.innerHTML = await response.text();

            const docRef = db.collection('fichas-supervisao-casos').doc(docId);
            const docSnap = await docRef.get();
            if (!docSnap.exists) throw new Error("Documento da ficha não encontrado.");
            const data = docSnap.data();

            // Preenche os campos (lógica similar à de fichas-preenchidas.js)
            const setFieldValue = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.value = value || '';
            };
            
            setFieldValue('supervisor-nome', data.identificacaoGeral?.supervisorUid);
            setFieldValue('data-supervisao', data.identificacaoGeral?.dataSupervisao);
            // ... (adicione aqui o preenchimento de todos os outros campos se necessário)

            // Lógica do botão voltar
            const backButton = formView.querySelector('#btn-voltar-para-lista');
            if (backButton) {
                backButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    alternarVisao('lista');
                });
            }

            // Habilita o autosave
            setupAutoSave(docRef);

        } catch (error) {
            console.error("Erro ao abrir formulário para edição:", error);
            formView.innerHTML = '<p class="alert alert-error">Não foi possível carregar o formulário de edição.</p>';
        }
    }
    
    // Configura o salvamento automático para o formulário
    function setupAutoSave(docRef) {
        const form = formView.querySelector('#form-supervisao');
        const statusEl = formView.querySelector('#autosave-status');
        if (!form || !statusEl) return;
        
        let saveTimeout;
        const handleFormChange = () => {
            clearTimeout(saveTimeout);
            statusEl.textContent = 'Salvando...';
            saveTimeout = setTimeout(async () => {
                const formData = new FormData(form);
                const dataToSave = {};
                // Constrói o objeto de dados a partir do formulário
                // (aqui você precisaria de uma lógica mais completa para mapear todos os campos)
                formData.forEach((value, key) => {
                    // Esta é uma forma simplificada. O ideal é reconstruir o objeto aninhado.
                    dataToSave[key] = value;
                });
                
                try {
                    await docRef.update(dataToSave);
                    statusEl.textContent = 'Salvo!';
                } catch (error) {
                    console.error("Erro no salvamento automático:", error);
                    statusEl.textContent = 'Erro ao salvar.';
                }
            }, 1500);
        };
        form.addEventListener('change', handleFormChange);
        form.addEventListener('keyup', handleFormChange);
    }


    // Inicia o carregamento das fichas
    try {
        const q = db.collection("fichas-supervisao-casos").where("supervisorUid", "==", user.uid);
        const querySnapshot = await q.get();
        const fichas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fichas.sort((a, b) => (b.criadoEm?.toDate() || 0) - (a.criadoEm?.toDate() || 0));
        renderizarLista(fichas);
    } catch (error) {
        console.error("Erro ao carregar fichas dos supervisionados:", error);
        listaContainer.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao buscar as fichas.</p>';
    }
}