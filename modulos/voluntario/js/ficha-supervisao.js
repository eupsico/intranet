// Arquivo: /modulos/voluntario/js/ficha-supervisao.js
// Versão: 2.2 (Navegação dinâmica e redirecionamento aprimorados)
// Descrição: Controla a criação e edição das fichas de acompanhamento de supervisão.

import { db, collection, getDocs, getDoc, doc, setDoc, updateDoc, query, where, serverTimestamp } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData, param) {
    const view = document.getElementById('supervisao-form-view');
    const contentArea = document.getElementById('form-content-area');
    if (!view || !contentArea) return;

    const formId = param || 'new';
    const userRoles = userData.funcoes || [];
    const isSupervisor = userRoles.includes('supervisor') || userRoles.includes('admin');

    // CORREÇÃO: Ajusta o botão "Voltar" com base no perfil do usuário
    const backButton = document.getElementById('form-back-button');
    if (isSupervisor) {
        backButton.href = '#supervisao'; // Supervisores voltam para a tela principal de abas
    } else {
        backButton.href = '#supervisao'; // Psicólogos também voltam para a tela principal
    }

    async function renderForm(docData = {}) {
        contentArea.innerHTML = `
            <form id="ficha-supervisao-form" class="dashboard-section">
                <h2>${formId === 'new' ? 'Nova Ficha de Acompanhamento' : 'Editar Ficha de Acompanhamento'}</h2>
                
                <div class="section-header"><h3>Identificação Geral</h3></div>
                <div class="form-group">
                    <label for="supervisorUid">Nome do supervisor(a):</label>
                    <select id="supervisorUid" name="supervisorUid" required><option value="">Carregando...</option></select>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="data">Data da supervisão:</label><input type="date" id="data" name="data" required></div>
                    <div class="form-group"><label for="terapiaInicio">Data de início da terapia:</label><input type="date" id="terapiaInicio" name="terapiaInicio"></div>
                </div>

                <div class="section-header"><h3>1. Identificação do Psicólogo(a)</h3></div>
                <div class="form-group">
                    <label>Nome do psicólogo (a):</label>
                    <input type="text" value="${userData.nome}" readonly>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="psicologoPeriodo">Período/Semestre (estagiários):</label><input type="number" id="psicologoPeriodo" name="psicologoPeriodo"></div>
                    <div class="form-group"><label for="psicologoAbordagem">Abordagem teórica:</label><input type="text" id="psicologoAbordagem" name="psicologoAbordagem"></div>
                </div>

                <div class="section-header"><h3>2. Identificação do Caso (dados sigilosos)</h3></div>
                <div class="form-group">
                    <label for="iniciaisPaciente">Iniciais do(a) paciente:</label>
                    <input type="text" id="iniciaisPaciente" name="iniciaisPaciente" required placeholder="Campo obrigatório">
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="pacienteIdade">Idade:</label><input type="number" id="pacienteIdade" name="pacienteIdade"></div>
                    <div class="form-group"><label for="pacienteGenero">Gênero:</label><input type="text" id="pacienteGenero" name="pacienteGenero"></div>
                    <div class="form-group"><label for="pacienteSessoes">Nº de sessões:</label><input type="number" id="pacienteSessoes" name="pacienteSessoes"></div>
                </div>
                <div class="form-group">
                    <label for="pacienteApresentacao">Apresentação geral (queixa, demanda):</label>
                    <textarea id="pacienteApresentacao" name="pacienteApresentacao" rows="3"></textarea>
                </div>
                
                <div class="form-actions" style="text-align: right; margin-top: 30px;">
                    <button type="submit" class="btn btn-primary">Salvar Ficha</button>
                </div>
            </form>
        `;

        await populateSelects(docData);
        if (formId !== 'new') {
            fillForm(docData);
        }
        document.getElementById('ficha-supervisao-form').addEventListener('submit', handleFormSubmit);
    }

    async function populateSelects(docData) {
        const supervisorSelect = document.getElementById('supervisorUid');
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
            supervisorSelect.innerHTML = '<option value="">Erro ao carregar supervisores</option>';
            console.error("Erro ao popular supervisores:", error);
        }
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

        data.profissionalUid = user.uid; // Corrigido de psicologoUid
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
                // CORREÇÃO: Redireciona para a página principal de supervisão
                window.location.hash = '#supervisao';
            } else {
                const docRef = doc(db, 'supervisao', formId);
                await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
                alert("Ficha atualizada com sucesso!");
                // Ao editar, volta para a página principal também
                window.location.hash = '#supervisao';
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
            await renderForm();
        } else {
            const docRef = doc(db, 'supervisao', formId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await renderForm(docSnap.data());
            } else {
                contentArea.innerHTML = '<p class="info-card" style="border-left-color: var(--cor-erro);">Ficha não encontrada.</p>';
            }
        }
    }

    load();
}