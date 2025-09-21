// Arquivo: /modulos/voluntario/js/ficha-supervisao.js
// Versão: 5.0 (Preenchimento de dados corrigido e implementação de auto-save)
import { db, collection, getDocs, getDoc, doc, setDoc, updateDoc, query, where, serverTimestamp } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData, param) {
    const viewContainer = document.getElementById('ficha-supervisao-view');
    const contentArea = document.getElementById('ficha-supervisao-content');
    if (!viewContainer || !contentArea) return;

    const formId = param || 'new';
    let autoSaveTimer = null;
    
    async function loadForm() {
        try {
            // O HTML já é carregado pelo roteador principal, então só precisamos encontrar o formulário
            const form = document.getElementById('ficha-supervisao-form');
            if (!form) {
                console.error("O formulário #ficha-supervisao-form não foi encontrado no DOM.");
                contentArea.innerHTML = `<p class="info-card error">Erro: O template do formulário não foi carregado.</p>`;
                return;
            }

            // Lógica do formulário
            await initializeForm(form, formId);

        } catch (error) {
            console.error("Erro ao carregar formulário:", error);
            contentArea.innerHTML = `<p class="info-card error">Não foi possível inicializar o formulário.</p>`;
        }
    }
    
    async function initializeForm(form, formId) {
        // Preenche o nome do profissional logado
        const psicologoNomeInput = form.querySelector('#psicologoNome');
        if (psicologoNomeInput) {
            psicologoNomeInput.value = userData.nome || 'Nome não encontrado';
        }

        const abordagemSelect = form.querySelector('#psicologoAbordagem');
        const outraAbordagemContainer = form.querySelector('#outraAbordagemContainer');
        if (abordagemSelect && outraAbordagemContainer) {
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
        
        // Adiciona listener para o auto-save
        form.addEventListener('input', () => {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => handleAutoSave(form, formId), 1500); // Salva 1.5s após a última digitação
        });
    }

    async function populateSupervisorSelect(form, docData = {}) {
        const supervisorSelect = form.querySelector('#supervisorUid');
        if (!supervisorSelect) return;
        try {
            const q = query(collection(db, 'usuarios'), where('funcoes', 'array-contains', 'supervisor'));
            const querySnapshot = await getDocs(q);
            supervisorSelect.innerHTML = '<option value="">Selecione um supervisor</option>';
            querySnapshot.forEach(doc => {
                const supervisor = doc.data();
                const option = new Option(supervisor.nome, doc.id);
                // Utiliza o UID para verificar se a opção deve ser selecionada
                if (doc.id === docData.supervisorUid) {
                    option.selected = true;
                }
                supervisorSelect.add(option);
            });
        } catch (error) {
            console.error("Erro ao popular supervisores:", error);
            supervisorSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    function fillForm(form, data) {
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

    async function handleAutoSave(form, currentFormId) {
        if (currentFormId === 'new') {
            console.log("Auto-save desativado para novas fichas. Preencha os campos obrigatórios primeiro.");
            // Poderia adicionar uma lógica para salvar um rascunho se desejado
            return;
        }

        console.log("Salvando alterações...");
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

        try {
            const docRef = doc(db, 'supervisao', currentFormId);
            await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
            console.log("Ficha atualizada com sucesso!");
            // Adicionar um feedback visual para o usuário, como um ícone de "salvo"
        } catch (error) {
            console.error("Erro no auto-save da ficha:", error);
        }
    }

    loadForm();
}