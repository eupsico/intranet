let db, user, userData;

// A MUDANÇA ESTÁ AQUI: A função init também recebe o objeto de contexto
export function init(context) {
    db = context.db;
    user = context.user;
    userData = context.userData;
    
    console.log("Módulo Ficha de Supervisão inicializado.");
    
    document.getElementById('nome-psicologo').value = userData.nomeCompleto || '';
    document.getElementById('psicologo-uid').value = user.uid || '';
    document.getElementById('data-supervisao').valueAsDate = new Date();

    loadSupervisores();

    const form = document.getElementById('form-supervisao');
    form.addEventListener('submit', salvarFicha);

    const btnLimpar = document.getElementById('btn-limpar-formulario');
    btnLimpar.addEventListener('click', () => {
        form.reset();
        document.getElementById('data-supervisao').valueAsDate = new Date();
    });
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