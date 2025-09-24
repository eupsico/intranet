// Arquivo: /modulos/servico-social/js/fila-atendimento.js
// Descrição: Controla a exibição e o preenchimento da ficha de triagem.

export function init(db, user, userData) {
    const patientDetailsContainer = document.getElementById('patient-details-container');
    const triagemForm = document.getElementById('triagem-form');
    const statusSelect = document.getElementById('triagem-status');
    const camposEncaminhado = document.getElementById('campos-encaminhado');
    const camposObservacao = document.getElementById('campos-observacao');
    const btnVoltar = document.getElementById('btn-voltar-lista');

    // Extrai o ID do paciente da URL
    const hashParts = window.location.hash.split('/');
    const patientId = hashParts.length > 1 ? hashParts[1] : null;

    if (!patientId) {
        patientDetailsContainer.innerHTML = '<p class="error-message">ID do paciente não fornecido.</p>';
        return;
    }

    // Carrega os dados do paciente do Firestore
    async function carregarDadosPaciente() {
        patientDetailsContainer.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const docRef = db.collection('inscricoes').doc(patientId);
            const doc = await doc.get();

            if (!doc.exists) {
                throw new Error("Paciente não encontrado.");
            }

            const data = doc.data();
            // Formata e exibe os dados do paciente na coluna da esquerda
            patientDetailsContainer.innerHTML = `
                <div class="patient-info-group">
                    <strong>Nome:</strong>
                    <p>${data.nomeCompleto || 'Não informado'}</p>
                </div>
                <div class="patient-info-group">
                    <strong>Telefone:</strong>
                    <p>${data.telefoneCelular || 'Não informado'}</p>
                </div>
                <div class="patient-info-group">
                    <strong>Email:</strong>
                    <p>${data.email || 'Não informado'}</p>
                </div>
                <div class="patient-info-group">
                    <strong>Data de Nascimento:</strong>
                    <p>${data.dataNascimento || 'Não informado'}</p>
                </div>
                <div class="patient-info-group">
                    <strong>Motivo da Busca:</strong>
                    <p>${data.motivoBusca || 'Não informado'}</p>
                </div>
                 <div class="patient-info-group">
                    <strong>Disponibilidade:</strong>
                    <p>${data.horariosEspecificos || 'Não informado'}</p>
                </div>
            `;
            
            // Pré-preenche a queixa no formulário de triagem
            document.getElementById('queixa-paciente').value = data.motivoBusca || '';

        } catch (error) {
            console.error("Erro ao carregar dados do paciente:", error);
            patientDetailsContainer.innerHTML = `<p class="error-message">Erro ao carregar dados: ${error.message}</p>`;
        }
    }

    // Controla quais campos do formulário são exibidos
    statusSelect.addEventListener('change', () => {
        const selectedValue = statusSelect.value;
        camposEncaminhado.style.display = selectedValue === 'encaminhado' ? 'block' : 'none';
        camposObservacao.style.display = selectedValue === 'nao_realizada' || selectedValue === 'desistiu' ? 'block' : 'none';
    });
    
    // Listener para o botão de voltar
    btnVoltar.addEventListener('click', () => {
        window.location.hash = '#agendamentos-triagem';
    });

    carregarDadosPaciente();
}