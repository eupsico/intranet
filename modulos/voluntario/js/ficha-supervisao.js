// Arquivo: /modulos/voluntario/js/ficha-supervisao.js (CORRIGIDO)
// Versão: 3.2 (Controla novo formulário e navegação)
// Descrição: Controla a criação e edição das fichas de acompanhamento.

import { db, collection, getDocs, getDoc, doc, setDoc, updateDoc, query, where, serverTimestamp } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData, param) {
    const formContainer = document.getElementById('ficha-supervisao');
    if (!formContainer) return;

    const formId = param || 'new';
    const form = document.getElementById('ficha-supervisao-form');
    
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
            if (abordagemSelect.value === 'Outra') {
                outraAbordagemContainer.style.display = 'block';
            } else {
                outraAbordagemContainer.style.display = 'none';
            }
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
        // Exibe o campo 'outra' se necessário
        if (data.psicologoAbordagem && abordagemSelect.value === 'Outra') {
            outraAbordagemContainer.style.display = 'block';
            form.elements['outraAbordagem'].value = data.outraAbordagem || '';
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        data.profissionalUid = user.uid;
        data.psicologoNome = userData.nome;
        
        const supervisorSelect = form.elements['supervisorUid'];
        if (supervisorSelect.selectedIndex > 0) {
            data.supervisorNome = supervisorSelect.options[supervisorSelect.selectedIndex].text;
        } else {
            data.supervisorNome = '';
        }

        // Se a abordagem for 'Outra', salva o valor do campo de texto
        if (data.psicologoAbordagem === 'Outra') {
            data.psicologoAbordagem = data.outraAbordagem;
        }
        delete data.outraAbordagem; // Remove o campo extra

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        try {
            if (formId === 'new') {
                const newDocRef = doc(collection(db, 'supervisao'));
                data.documentId = newDocRef.id; // Salva o ID do documento dentro dele mesmo
                await setDoc(newDocRef, { ...data, createdAt: serverTimestamp() });
                alert("Ficha salva com sucesso!");
                window.viewNavigator.back();
            } else {
                const docRef = doc(db, 'supervisao', formId);
                await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
                alert("Ficha atualizada com sucesso!");
                window.viewNavigator.back();
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
                formContainer.innerHTML = '<p class="info-card" style="border-left-color: var(--cor-erro);">Ficha não encontrada.</p>';
            }
        }
        form.addEventListener('submit', handleFormSubmit);
    }

    load();
}