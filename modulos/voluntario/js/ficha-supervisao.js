// Arquivo: /modulos/voluntario/js/ficha-supervisao.js
// Versão: 6.0 (Preenchimento de dados corrigido, auto-save para edições e botão de salvar para novas fichas)
import { db, collection, getDocs, getDoc, doc, setDoc, updateDoc, query, where, serverTimestamp } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData, param) {
    const contentArea = document.getElementById('ficha-supervisao-content');
    if (!contentArea) return;

    let formId = param || 'new'; // Mantém o controle do ID da ficha atual
    let autoSaveTimer = null;
    let isSaving = false;

    // Função para debounce, evita salvar a cada tecla pressionada
    function debounce(func, delay) {
        return function(...args) {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    async function initializeForm() {
        const form = document.getElementById('ficha-supervisao-form');
        if (!form) {
            console.error("O formulário #ficha-supervisao-form não foi encontrado no DOM.");
            contentArea.innerHTML = `<p class="info-card error">Erro: O template do formulário não foi carregado.</p>`;
            return;
        }

        // Preenche o nome do profissional logado
        const psicologoNomeInput = form.querySelector('#psicologoNome');
        if (psicologoNomeInput) {
            psicologoNomeInput.value = userData.nome || 'Nome não encontrado';
        }

        // Lógica do campo 'Outra Abordagem'
        const abordagemSelect = form.querySelector('#psicologoAbordagem');
        const outraAbordagemContainer = form.querySelector('#outraAbordagemContainer');
        if (abordagemSelect && outraAbordagemContainer) {
            abordagemSelect.addEventListener('change', () => {
                outraAbordagemContainer.style.display = abordagemSelect.value === 'Outra' ? 'block' : 'none';
            });
        }
        
        // Carrega a lista de supervisores
        await populateSupervisorSelect(form);

        if (formId === 'new') {
            // Se for uma ficha nova, adiciona um botão para criar o documento
            const formActions = form.querySelector('.form-actions');
            const saveButton = document.createElement('button');
            saveButton.type = 'submit';
            saveButton.className = 'btn btn-primary';
            saveButton.textContent = 'Criar e Salvar Ficha';
            formActions.innerHTML = ''; // Limpa a área de ações
            formActions.appendChild(saveButton);
            form.addEventListener('submit', handleFormSubmit);
        } else {
            // Se for uma ficha existente, carrega os dados e ativa o auto-save
            const docRef = doc(db, 'supervisao', formId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                fillForm(form, docSnap.data());
                // O Debounce garante que a função de salvar só seja chamada após o usuário parar de digitar
                form.addEventListener('input', debounce(() => handleAutoSave(form), 2000));
            } else {
                contentArea.innerHTML = '<p class="info-card error">Ficha não encontrada.</p>';
            }
        }
    }

    async function populateSupervisorSelect(form) {
        const supervisorSelect = form.querySelector('#supervisorUid');
        if (!supervisorSelect) return;
        try {
            const q = query(collection(db, 'usuarios'), where('funcoes', 'array-contains', 'supervisor'));
            const querySnapshot = await getDocs(q);
            supervisorSelect.innerHTML = '<option value="">Selecione um supervisor</option>';
            querySnapshot.forEach(doc => {
                const supervisor = doc.data();
                const option = new Option(supervisor.nome, doc.id);
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
                if(form.elements[key].type === 'select-one'){
                    // Garante que a opção correta seja selecionada
                    const optionExists = [...form.elements[key].options].some(opt => opt.value === data[key]);
                    if(optionExists) form.elements[key].value = data[key];
                } else {
                    form.elements[key].value = data[key];
                }
            }
        }
        // Lógica para 'Outra' abordagem
        const abordagemSelect = form.querySelector('#psicologoAbordagem');
        if (data.psicologoAbordagem && ![...abordagemSelect.options].some(opt => opt.value === data.psicologoAbordagem)) {
            abordagemSelect.value = 'Outra';
            form.querySelector('#outraAbordagemContainer').style.display = 'block';
            form.elements['outraAbordagem'].value = data.psicologoAbordagem;
        }
    }
    
    // Função para salvar uma nova ficha (acionada pelo botão)
    async function handleFormSubmit(e) {
        e.preventDefault();
        if (isSaving) return;
        isSaving = true;
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        const data = getFormData(form);

        try {
            const newDocRef = doc(collection(db, 'supervisao'));
            data.id = newDocRef.id;
            await setDoc(newDocRef, { ...data, createdAt: serverTimestamp() });
            alert("Ficha criada com sucesso!");
            // Atualiza a URL para o ID do novo documento e muda para o modo de edição com auto-save
            formId = newDocRef.id;
            window.location.hash = `#ficha-supervisao/${formId}`;
            // Remove o botão de submit e ativa o auto-save
            submitButton.remove();
            form.removeEventListener('submit', handleFormSubmit);
            form.addEventListener('input', debounce(() => handleAutoSave(form), 2000));
        } catch (error) {
            console.error("Erro ao criar a ficha:", error);
            alert("Ocorreu um erro ao criar a ficha: " + error.message);
            submitButton.disabled = false;
            submitButton.textContent = 'Criar e Salvar Ficha';
        } finally {
            isSaving = false;
        }
    }

    // Função para salvar alterações em uma ficha existente (auto-save)
    async function handleAutoSave(form) {
        if (isSaving || formId === 'new') return;
        isSaving = true;
        console.log("Auto-save acionado...");
        const data = getFormData(form);
        try {
            const docRef = doc(db, 'supervisao', formId);
            await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
            console.log("Ficha atualizada com sucesso!");
            // Adicionar um feedback visual (ex: um ícone de 'Salvo!')
        } catch (error) {
            console.error("Erro no auto-save da ficha:", error);
        } finally {
            isSaving = false;
        }
    }
    
    // Função auxiliar para extrair dados do formulário
    function getFormData(form) {
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
        return data;
    }

    initializeForm();
}