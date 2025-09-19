// O script é envolvido em uma função anônima para evitar poluir o escopo global.
(function() {
    // Verifica se as instâncias do Firebase (db, auth) estão disponíveis.
    if (typeof db === 'undefined' || typeof auth === 'undefined') {
        console.error("Firebase não foi inicializado. Este script deve ser carregado após a inicialização do Firebase.");
        return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.error("Usuário não autenticado.");
        return; // Sai se não houver usuário logado.
    }

    // Seleciona os elementos da view que acabamos de carregar.
    const listaContainer = document.getElementById('lista-supervisionados-container');
    const filtroPacienteSelect = document.getElementById('filtro-paciente');
    const filtroProfissionalSelect = document.getElementById('filtro-profissional');
    const filtrosContainer = document.getElementById('filtros-supervisionados-container');

    // Armazena todos os registros para evitar múltiplas chamadas ao banco de dados.
    let todosOsRegistros = [];

    /**
     * Renderiza a lista de supervisionados na tela.
     * @param {Array} registros - A lista de registros de supervisão para exibir.
     */
    function renderizarLista(registros) {
        listaContainer.innerHTML = '';
        if (registros.length === 0) {
            listaContainer.innerHTML = '<p class="text-center">Nenhum acompanhamento encontrado com os filtros atuais.</p>';
            return;
        }

        registros.forEach(registro => {
            const dataFormatada = registro.supervisaoData ? new Date(registro.supervisaoData + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
            const div = document.createElement('div');
            // Adiciona classes do design system para um visual consistente.
            div.className = 'registro-item card'; 
            div.dataset.id = registro.id;
            
            // O evento de clique é adicionado diretamente aqui.
            div.addEventListener('click', () => {
                if (window.loadFormularioView) {
                    window.loadFormularioView(registro.id);
                } else {
                    console.error("A função loadFormularioView não foi encontrada no escopo global.");
                    alert("Erro: Não foi possível abrir o formulário de supervisão.");
                }
            });

            div.innerHTML = `
                <div class="card-body">
                    <div class="info-group"><strong>Paciente:</strong><span>${registro.pacienteIniciais || 'N/A'}</span></div>
                    <div class="info-group"><strong>Profissional:</strong><span>${registro.psicologoNome || 'N/A'}</span></div>
                    <div class="info-group"><strong>Data da Supervisão:</strong><span>${dataFormatada}</span></div>
                </div>`;
            listaContainer.appendChild(div);
        });
    }

    /**
     * Popula o dropdown de filtro de pacientes com base nos registros carregados.
     */
    function popularFiltros() {
        const profissionais = new Map();
        const pacientes = new Map();

        todosOsRegistros.forEach(reg => {
            if (reg.psicologoUid && reg.psicologoNome) {
                profissionais.set(reg.psicologoUid, reg.psicologoNome);
            }
            if (reg.pacienteIniciais) {
                pacientes.set(reg.pacienteIniciais.toLowerCase(), reg.pacienteIniciais);
            }
        });

        // Popula filtro de profissionais
        filtroProfissionalSelect.innerHTML = '<option value="">Todos os Profissionais</option>';
        profissionais.forEach((nome, uid) => {
            const option = document.createElement('option');
            option.value = uid;
            option.textContent = nome;
            filtroProfissionalSelect.appendChild(option);
        });

        // Popula filtro de pacientes
        filtroPacienteSelect.innerHTML = '<option value="">Todos os Pacientes</option>';
        pacientes.forEach((nome, chave) => {
            const option = document.createElement('option');
            option.value = chave;
            option.textContent = nome;
            filtroPacienteSelect.appendChild(option);
        });
    }

    /**
     * Filtra os registros com base nos valores selecionados nos dropdowns.
     */
    function aplicarFiltros() {
        const termoPaciente = filtroPacienteSelect.value;
        const uidProfissional = filtroProfissionalSelect.value;

        const registrosFiltrados = todosOsRegistros.filter(reg => {
            const matchPaciente = !termoPaciente || (reg.pacienteIniciais && reg.pacienteIniciais.toLowerCase() === termoPaciente);
            const matchProfissional = !uidProfissional || reg.psicologoUid === uidProfissional;
            return matchPaciente && matchProfissional;
        });

        renderizarLista(registrosFiltrados);
    }

    /**
     * Carrega os dados dos supervisionados do Firestore.
     */
    async function carregarSupervisionados() {
        listaContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const snapshot = await db.collection('supervisao')
                .where('supervisorUid', '==', currentUser.uid)
                .orderBy('supervisaoData', 'desc')
                .get();

            if (snapshot.empty) {
                if(filtrosContainer) filtrosContainer.style.display = 'none';
                listaContainer.innerHTML = '<p class="text-center lead">Nenhum acompanhamento encontrado para sua supervisão.</p>';
                return;
            }
            
            todosOsRegistros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            popularFiltros();
            renderizarLista(todosOsRegistros);

            // Adiciona os listeners de evento *depois* de popular os filtros.
            filtroProfissionalSelect.addEventListener('change', aplicarFiltros);
            filtroPacienteSelect.addEventListener('change', aplicarFiltros);

        } catch (error) {
            console.error("Erro ao carregar supervisionados:", error);
            listaContainer.innerHTML = `<p class="text-danger text-center">Ocorreu um erro ao carregar a lista.</p>`;
        }
    }

    // Inicia o processo de carregamento dos dados.
    carregarSupervisionados();
})();