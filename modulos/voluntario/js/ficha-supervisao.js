let db, user, userData;

export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;

    setTimeout(() => {
        console.log("Módulo Ficha de Supervisão (nova versão) inicializado.");
        
        const form = document.getElementById('form-supervisao');
        if (!form) {
            console.error("Formulário #form-supervisao não encontrado.");
            return;
        }

        setupInitialData();
        setupEventListeners();
        loadSupervisores();
    }, 0);
}

function setupInitialData() {
    document.getElementById('psicologo-nome').value = userData.nome || '';
    document.getElementById('fase1-data').valueAsDate = new Date();
    document.getElementById('data-supervisao').valueAsDate = new Date();
}

function setupEventListeners() {
    const form = document.getElementById('form-supervisao');
    const btnLimpar = document.getElementById('btn-limpar-formulario');
    const abordagemSelect = document.getElementById('abordagem-teorica');

    form.addEventListener('submit', salvarFicha);
    
    btnLimpar.addEventListener('click', () => {
        form.reset();
        setupInitialData(); // Repopula dados fixos
        document.getElementById('outra-abordagem-container').style.display = 'none';
    });

    abordagemSelect.addEventListener('change', (e) => {
        const outraContainer = document.getElementById('outra-abordagem-container');
        outraContainer.style.display = (e.target.value === 'Outra') ? 'block' : 'none';
    });
}

async function loadSupervisores() {
    const select = document.getElementById('supervisor-nome');
    select.innerHTML = '<option value="">Carregando...</option>';
    try {
        const querySnapshot = await db.collection("usuarios").where("funcoes", "array-contains", "supervisor").orderBy("nomeCompleto").get();
        if (querySnapshot.empty) {
            select.innerHTML = '<option value="">Nenhum supervisor encontrado</option>';
            return;
        }
        let options = '<option value="">Selecione um supervisor</option>';
        querySnapshot.forEach(doc => {
            options += `<option value="${doc.id}" data-nome="${doc.data().nomeCompleto}">${doc.data().nomeCompleto}</option>`;
        });
        select.innerHTML = options;
    } catch (error) {
        console.error("Erro ao carregar supervisores:", error);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function salvarFicha(event) {
    event.preventDefault();
    const btnSalvar = document.getElementById('btn-salvar-ficha');
    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';
    
    const supervisorSelect = document.getElementById('supervisor-nome');
    const selectedSupervisorOption = supervisorSelect.options[supervisorSelect.selectedIndex];

    const abordagem = document.getElementById('abordagem-teorica').value;
    const abordagemTexto = abordagem === 'Outra' ? document.getElementById('outra-abordagem-texto').value : abordagem;

    const formData = {
        criadoEm: new Date(),
        psicologoUid: user.uid,
        psicologoNome: document.getElementById('psicologo-nome').value,
        
        identificacaoGeral: {
            supervisorUid: selectedSupervisorOption.value,
            supervisorNome: selectedSupervisorOption.dataset.nome,
            dataSupervisao: document.getElementById('data-supervisao').value,
            dataInicioTerapia: document.getElementById('data-inicio-terapia').value,
        },
        identificacaoPsicologo: {
            periodo: document.getElementById('psicologo-periodo').value,
            abordagem: abordagemTexto,
        },
        identificacaoCaso: {
            iniciais: document.getElementById('paciente-iniciais').value.toUpperCase(),
            idade: document.getElementById('paciente-idade').value,
            genero: document.getElementById('paciente-genero').value,
            numSessoes: document.getElementById('paciente-sessoes').value,
            queixa: document.getElementById('queixa-demanda').value,
        },
        fase1: {
            data: document.getElementById('fase1-data').value,
            foco: document.getElementById('fase1-foco').value,
            objetivos: document.getElementById('fase1-objetivos').value,
            hipoteses: document.getElementById('fase1-hipoteses').value,
        },
        fase2: {
            data: document.getElementById('fase2-data').value,
            reavaliacao: document.getElementById('fase2-reavaliacao').value,
            progresso: document.getElementById('fase2-progresso').value,
        },
        fase3: {
            data: document.getElementById('fase3-data').value,
            avaliacao: document.getElementById('fase3-avaliacao').value,
            mudancas: document.getElementById('fase3-mudancas').value,
        },
        observacoesFinais: {
            desfecho: document.getElementById('desfecho').value,
            dataDesfecho: document.getElementById('data-desfecho').value,
            observacoes: document.getElementById('obs-finais').value,
        },
        // Campos do supervisor (salvos em branco inicialmente)
        supervisorFields: {
            fase1_obs: "", fase2_obs: "", fase3_obs: "",
            finais_obs: "", assinatura: ""
        }
    };

    try {
        await db.collection("fichas-supervisao-casos").add(formData); // Salva em uma nova coleção
        alert("Ficha de caso salva com sucesso!");
        document.getElementById('form-supervisao').reset();
        setupInitialData();
        document.getElementById('outra-abordagem-container').style.display = 'none';
    } catch (error) {
        console.error("Erro ao salvar a ficha:", error);
        alert("Ocorreu um erro ao salvar a ficha. Tente novamente.");
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar Ficha';
    }
}