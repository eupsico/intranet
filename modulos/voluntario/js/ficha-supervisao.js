// Arquivo: /modulos/voluntario/js/ficha-supervisao.js (CORRIGIDO)
// Versão: 3.3 (Controla novo formulário, navegação e nome de campo 'psicologoUid')
// Descrição: Controla a criação e edição das fichas de acompanhamento.

import { db, collection, getDocs, getDoc, doc, setDoc, updateDoc, query, where, serverTimestamp } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData, param) {
    const viewContainer = document.getElementById('content-area'); // O container principal
    if (!viewContainer) return;

    const formId = param || 'new';
    const form = viewContainer.querySelector('#ficha-supervisao-form');
    
    if (!form) {
        console.error("O formulário #ficha-supervisao-form não foi encontrado no DOM.");
        return;
    }
    
    const psicologoNomeInput = form.querySelector('#psicologoNome');
    if (psicologoNomeInput) {
        psicologoNomeInput.value = userData.nome;
    }

    // Lógica para o campo "Outra Abordagem"
    const abordagemSelect = form.querySelector('#psicologoAbordagem');
    const outraAbordagemContainer = form.querySelector('#outraAbordagemContainer');
    if (abordagemSelect && outraAbordagemContainer) {
        abordagemSelect.addEventListener('change', () => {
            outraAbordagemContainer.style.display = abordagemSelect.value === 'Outra' ? 'block' : 'none';
        });
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
        if (data.psicologoAbordagem) {
            const isStandardOption = [...abordagemSelect.options].some(opt => opt.value === data.psicologoAbordagem);
            if (!isStandardOption) {
                abordagemSelect.value = 'Outra';
                outraAbordagemContainer.style.display = 'block';
                form.elements['outraAbordagem'].value = data.psicologoAbordagem;
            } else {
                 abordagemSelect.value = data.psicologoAbordagem;
            }
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // CORREÇÃO: Usando o nome de campo correto do Firestore: 'psicologoUid'
        data.psicologoUid = user.uid;
        data.psicologoNome = userData.nome;
        
        const supervisorSelect = form.elements['supervisorUid'];
        if (supervisorSelect.selectedIndex > 0) {
            data.supervisorNome = supervisorSelect.options[supervisorSelect.selectedIndex].text;
        } else {
            data.supervisorNome = '';
        }

        if (data.psicologoAbordagem === 'Outra') {
            data.psicologoAbordagem = data.outraAbordagem;
        }
        delete data.outraAbordagem;

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        try {
            const userRoles = userData.funcoes || [];
            const returnHash = userRoles.includes('supervisor') || userRoles.includes('admin') ? '#painel-supervisor' : '#painel-supervisionado';

            if (formId === 'new') {
                const newDocRef = doc(collection(db, 'supervisao'));
                data.documentId = newDocRef.id;
                await setDoc(newDocRef, { ...data, createdAt: serverTimestamp() });
                alert("Ficha salva com sucesso!");
                window.location.hash = returnHash;
            } else {
                const docRef = doc(db, 'supervisao', formId);
                await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
                alert("Ficha atualizada com sucesso!");
                window.location.hash = returnHash;
            }
        } catch (error) {
            console.error("Erro ao salvar a ficha:", error);
            alert("Ocorreu um erro ao salvar: " + error.message);
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
                viewContainer.innerHTML = '<p class="info-card" style="border-left-color: var(--cor-erro);">Ficha não encontrada.</p>';
            }
        }
        form.addEventListener('submit', handleFormSubmit);
    }

    load();
}