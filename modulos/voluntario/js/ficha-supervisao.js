// Arquivo: /modulos/voluntario/js/ficha-supervisao.js
// Versão: 3.0 (Adaptado para a nova estrutura de abas)
// Descrição: Controla a criação e edição das fichas de acompanhamento.

import { db, collection, getDocs, getDoc, doc, setDoc, updateDoc, query, where, serverTimestamp } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData, param) {
    const formContainer = document.getElementById('ficha-supervisao');
    if (!formContainer) return;

    const formId = param || 'new';

    // O HTML do formulário já foi carregado pelo painel-supervisionado.js
    // Agora, apenas adicionamos a interatividade.
    
    const form = document.getElementById('ficha-supervisao-form');
    
    // Preenche o nome do psicólogo logado
    const psicologoNomeInput = form.querySelector('#psicologoNome');
    if (psicologoNomeInput) {
        psicologoNomeInput.value = userData.nome;
    }

    async function populateSupervisorSelect(docData = {}) {
        const supervisorSelect = form.querySelector('#supervisorUid');
        try {
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
        } catch (error) {
            supervisorSelect.innerHTML = '<option value="">Erro ao carregar</option>';
            console.error("Erro ao popular supervisores:", error);
        }
    }

    function fillForm(data) {
        for (const key in data) {
            if (form.elements[key]) {
                form.elements[key].value = data[key];
            }
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        data.profissionalUid = user.uid;
        data.psicologoNome = userData.nome;
        const supervisorSelect = form.elements['supervisorUid'];
        data.supervisorNome = supervisorSelect.options[supervisorSelect.selectedIndex].text;

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        try {
            if (formId === 'new') {
                const newDocRef = doc(collection(db, 'supervisao'));
                await setDoc(newDocRef, { ...data, createdAt: serverTimestamp() });
                alert("Ficha salva com sucesso!");
                window.location.hash = '#painel-supervisionado'; // Volta para o painel
            } else {
                const docRef = doc(db, 'supervisao', formId);
                await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
                alert("Ficha atualizada com sucesso!");
                window.location.hash = '#painel-supervisionado'; // Volta para o painel
            }
        } catch (error) {
            console.error("Erro ao salvar a ficha:", error);
            alert("Ocorreu um erro ao salvar.");
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Ficha';
        }
    }

    async function load() {
        if (formId === 'new') {
            await populateSupervisorSelect();
        } else {
            const docRef = doc(db, 'supervisao', formId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                await populateSupervisorSelect(data);
                fillForm(data);
            } else {
                formContainer.innerHTML = '<p class="info-card" style="border-left-color: var(--cor-erro);">Ficha não encontrada.</p>';
            }
        }
        form.addEventListener('submit', handleFormSubmit);
    }

    load();
}