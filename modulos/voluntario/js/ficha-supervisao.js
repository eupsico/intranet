let db, user, userData;

// A função de inicialização que é chamada pelo supervisao.js
export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;
    
    // A CORREÇÃO ESTÁ AQUI:
    // Usamos um setTimeout para garantir que o HTML seja totalmente renderizado
    // antes de o JavaScript tentar interagir com ele.
    setTimeout(() => {
        console.log("Módulo Ficha de Supervisão inicializado.");

        // Seleciona os elementos do formulário
        const form = document.getElementById('form-supervisao');
        const btnLimpar = document.getElementById('btn-limpar-formulario');

        // Verifica se os elementos essenciais existem antes de continuar
        if (!form || !btnLimpar) {
            console.error("Erro crítico: Elementos do formulário da ficha de supervisão não foram encontrados no DOM.");
            return;
        }
        
        // Preenche os dados iniciais do formulário
        document.getElementById('nome-psicologo').value = userData.nomeCompleto || '';
        document.getElementById('psicologo-uid').value = user.uid || '';
        document.getElementById('data-supervisao').valueAsDate = new Date();

        // Carrega a lista de supervisores
        loadSupervisores();

        // Adiciona os eventos de clique e envio
        form.addEventListener('submit', salvarFicha);
        btnLimpar.addEventListener('click', () => {
            form.reset();
            document.getElementById('data-supervisao').valueAsDate = new Date();
        });

    }, 0); // O '0' faz com que execute na próxima oportunidade, quando o DOM estiver pronto.
}

async function loadSupervisores() {
    const select = document.getElementById('supervisor');
    select.innerHTML = '<option value="">Carregando...</option>';

    try {
        const querySnapshot = await db.collection("usuarios").where("funcoes", "array-contains", "supervisor").orderBy("nomeCompleto").get();
        
        if (querySnapshot.empty) {
            select.innerHTML = '<option value="">Nenhum supervisor encontrado</option>';
            return;
        }

        let options = '<option value="">Selecione um supervisor</option>';
        querySnapshot.forEach(doc => {
            const supervisorData = doc.data();
            options += `<option value="${doc.id}">${supervisorData.nomeCompleto}</option>`;
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

    const formData = {
        psicologoUid: document.getElementById('psicologo-uid').value,
        psicologoNome: document.getElementById('nome-psicologo').value,
        dataSupervisao: document.getElementById('data-supervisao').value,
        supervisorUid: document.getElementById('supervisor').value,
        supervisorNome: document.getElementById('supervisor').options[document.getElementById('supervisor').selectedIndex].text,
        iniciaisPaciente: document.getElementById('iniciais-paciente').value.toUpperCase(),
        idadePaciente: document.getElementById('idade-paciente').value,
        sexoPaciente: document.getElementById('sexo-paciente').value,
        queixaPrincipal: document.getElementById('queixa-principal').value,
        resumoSessao: document.getElementById('resumo-sessao').value,
        dificuldades: document.getElementById('manejo-clinico').value,
        orientacoesSupervisor: document.getElementById('intervencoes-supervisor').value,
        criadoEm: new Date()
    };
    
    try {
        await db.collection("fichas-supervisao").add(formData);
        alert("Ficha de supervisão salva com sucesso!");
        document.getElementById('form-supervisao').reset();
        document.getElementById('data-supervisao').valueAsDate = new Date();

    } catch (error) {
        console.error("Erro ao salvar a ficha:", error);
        alert("Ocorreu um erro ao salvar a ficha. Por favor, tente novamente.");
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar Ficha';
    }
}