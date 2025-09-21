// Arquivo: /modulos/voluntario/js/ficha-supervisao.js (CORRIGIDO)
// Versão: 4.0 (Simplificado para view dedicada)
// Descrição: Controla a criação e edição das fichas de acompanhamento.

import { db, collection, getDocs, getDoc, doc, setDoc, updateDoc, query, where, serverTimestamp } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData, param) {
    const viewContainer = document.getElementById('ficha-supervisao-view');
    const contentArea = document.getElementById('ficha-supervisao-content');
    if (!viewContainer || !contentArea) return;

    const formId = param || 'new';
    
    async function loadForm() {
        try {
            const response = await fetch('./ficha-supervisao-completa.html');
            if (!response.ok) throw new Error('Falha ao carregar o HTML do formulário.');
            contentArea.innerHTML = await response.text();
            
            const form = document.getElementById('ficha-supervisao-form');
            if (!form) {
                console.error("O formulário #ficha-supervisao-form não foi encontrado no DOM.");
                return;
            }

            // Define o botão voltar
            const userRoles = userData.funcoes || [];
            const isSupervisor = userRoles.includes('supervisor') || userRoles.includes('admin');
            const backButton = document.getElementById('back-to-panel-button');
            backButton.href = isSupervisor ? '#painel-supervisor' : '#painel-supervisionado';
            
            // Lógica do formulário
            initializeForm(form, formId);

        } catch (error) {
            console.error("Erro ao carregar formulário:", error);
            contentArea.innerHTML = `<p class="info-card error">Não foi possível carregar o formulário.</p>`;
        }
    }
    
    async function initializeForm(form, formId) {
        const psicologoNomeInput = form.querySelector('#psicologoNome');
        if (psicologoNomeInput) {
            psicologoNomeInput.value = userData.nome;
        }

        const abordagemSelect = form.querySelector('#psicologoAbordagem');
        const outraAbordagemContainer = form.querySelector('#outraAbordagemContainer');
        if (abordagemSelect) {
            abordagemSelect.addEventListener('change', () => {
                outraAbordagemContainer.style.display = abordagemSelect.value === 'Outra' ? 'block' : 'none';
            });
        }

        if (formId === 'new') {
            await populateSupervisorSelect(form);
        } else {
            const docRef = doc(db, 'supervisao', formId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                await populateSupervisorSelect(form, data);
                fillForm(form, data);
            } else {
                contentArea.innerHTML = '<p class="info-card error">Ficha não encontrada.</p>';
            }
        }
        form.addEventListener('submit', (e) => handleFormSubmit(e, form, formId));
    }

    async function populateSupervisorSelect(form, docData = {}) {
        const supervisorSelect = form.querySelector('#supervisorUid');
        // ... (código para popular supervisores, sem alterações)
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
        }
    }

    function fillForm(form, data) {
        // ... (código para preencher o formulário, sem alterações)
        for (const key in data) {
            if (form.elements[key]) {
                form.elements[key].value = data[key];
            }
        }
        const abordagemSelect = form.querySelector('#psicologoAbordagem');
        const outraAbordagemContainer = form.querySelector('#outraAbordagemContainer');
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

    async function handleFormSubmit(e, form, formId) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        data.psicologoUid = user.uid;
        data.psicologoNome = userData.nome;
        
        const supervisorSelect = form.elements['supervisorUid'];
        if (supervisorSelect.selectedIndex > 0) {
            data.supervisorNome = supervisorSelect.options[supervisorSelect.selectedIndex].text;
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

    loadForm();
}