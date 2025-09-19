import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

export function init(db, user, userData, param) {
    const viewContainer = document.getElementById('supervisao-form-view');
    const contentArea = document.getElementById('form-content-area');
    if (!viewContainer || !contentArea) return;

    const formId = param; // 'new' ou um ID de documento

    async function renderForm(docData = {}) {
        // HTML do formulário, adaptado do original
        contentArea.innerHTML = `
            <form id="ficha-supervisao-form">
                <div class="view-header-band"><h1>Ficha de Acompanhamento</h1></div>
                <div class="section-subtitle">Identificação Geral</div>
                <div class="form-group">
                    <label for="supervisor-nome">Nome do supervisor(a):</label>
                    <select id="supervisor-nome" name="supervisorUid" required><option value="">Carregando...</option></select>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="supervisao-data">Data da supervisão:</label><input type="date" id="supervisao-data" name="supervisaoData"></div>
                    <div class="form-group"><label for="terapia-inicio">Data de início da terapia:</label><input type="date" id="terapia-inicio" name="terapiaInicio"></div>
                </div>
                <div class="section-subtitle">1. Identificação do Psicólogo(a)</div>
                <div class="form-group">
                    <label for="psicologo-nome">Nome do psicólogo (a):</label>
                    <input type="text" id="psicologo-nome" readonly>
                </div>
                <div class="section-subtitle">2. Identificação do Caso (dados sigilosos)</div>
                <div class="form-group">
                    <label for="paciente-iniciais">Iniciais do(a) paciente:</label>
                    <input type="text" id="paciente-iniciais" name="pacienteIniciais" required placeholder="Campo obrigatório">
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="paciente-idade">Idade:</label><input type="number" id="paciente-idade" name="pacienteIdade"></div>
                    <div class="form-group"><label for="paciente-genero">Gênero:</label><input type="text" id="paciente-genero" name="pacienteGenero"></div>
                    <div class="form-group"><label for="paciente-sessoes">Nº de sessões:</label><input type="number" id="paciente-sessoes" name="pacienteSessoes"></div>
                </div>
                <div class="form-group"><label for="paciente-apresentacao">Apresentação geral (queixa, demanda):</label><textarea id="paciente-apresentacao" name="pacienteApresentacao" rows="3"></textarea></div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Salvar Ficha</button>
                </div>
            </form>
        `;
        
        // Popula as listas de seleção
        await populateSelects(docData);
        
        // Preenche os dados se for uma edição
        if (formId !== 'new') {
            fillForm(docData);
        }
        
        // Adiciona o listener de submit
        document.getElementById('ficha-supervisao-form').addEventListener('submit', handleFormSubmit);
    }

    async function populateSelects(docData) {
        // Popula psicólogo (usuário logado)
        document.getElementById('psicologo-nome').value = userData.nome;

        // Popula supervisores
        const supervisorSelect = document.getElementById('supervisor-nome');
        const q = query(collection(db, 'usuarios'), where('funcoes', 'array-contains', 'supervisor'));
        const querySnapshot = await getDocs(q);
        supervisorSelect.innerHTML = '<option value="">Selecione um supervisor</option>';
        querySnapshot.forEach(doc => {
            const supervisor = doc.data();
            const option = new Option(supervisor.nome, doc.id);
            if (doc.id === docData.supervisorUid) {
                option.selected = true;
            }
            supervisorSelect.add(option);
        });
    }

    function fillForm(data) {
        const form = document.getElementById('ficha-supervisao-form');
        for (const key in data) {
            if (form.elements[key]) {
                form.elements[key].value = data[key];
            }
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Adiciona dados que não estão no formulário
        data.psicologoUid = user.uid;
        data.psicologoNome = userData.nome;
        const supervisorSelect = form.elements['supervisorUid'];
        data.supervisorNome = supervisorSelect.options[supervisorSelect.selectedIndex].text;

        try {
            if (formId === 'new') {
                // Cria um novo documento
                const newDocRef = doc(collection(db, 'supervisao'));
                await setDoc(newDocRef, { ...data, createdAt: serverTimestamp() });
                alert("Ficha salva com sucesso!");
                window.location.hash = `#meus-acompanhamentos`; // Navega para a lista após salvar
            } else {
                // Atualiza um documento existente
                const docRef = doc(db, 'supervisao', formId);
                await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
                alert("Ficha atualizada com sucesso!");
            }
        } catch (error) {
            console.error("Erro ao salvar a ficha:", error);
            alert("Ocorreu um erro ao salvar. Tente novamente.");
        }
    }

    async function load() {
        if (formId === 'new') {
            renderForm();
        } else {
            const docRef = doc(db, 'supervisao', formId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                renderForm(docSnap.data());
            } else {
                contentArea.innerHTML = '<p class="alert alert-error">Ficha não encontrada.</p>';
            }
        }
    }

    load();
}