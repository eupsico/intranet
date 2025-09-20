// Arquivo: /modulos/voluntario/js/ficha-supervisao.js
// Versão: 2.1 (Corrigido com HTML completo e mantendo a lógica original)
// Descrição: Controla a criação e edição das fichas de acompanhamento de supervisão.

import { collection, getDocs, getDoc, doc, setDoc, updateDoc, query, where, serverTimestamp } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData, param) {
    const contentArea = document.getElementById('form-content-area');
    if (!contentArea) return;

    const formId = param || 'new'; // 'new' para um novo formulário ou um ID de documento para edição

    /**
     * Renderiza o formulário na tela.
     * @param {object} docData - Dados existentes do documento para preencher o formulário.
     */
    async function renderForm(docData = {}) {
        // CORREÇÃO: O innerHTML foi substituído pela estrutura completa do formulário.
        contentArea.innerHTML = `
            <form id="ficha-supervisao-form">
                <div class="view-header-band"><h1>Ficha de Acompanhamento</h1></div>
                
                <div class="section-subtitle">Identificação Geral</div>
                <div class="form-group">
                    <label for="supervisorUid">Nome do supervisor(a):</label>
                    <select id="supervisorUid" name="supervisorUid" required><option value="">Carregando...</option></select>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="supervisaoData">Data da supervisão:</label><input type="date" id="supervisaoData" name="supervisaoData" required></div>
                    <div class="form-group"><label for="terapiaInicio">Data de início da terapia:</label><input type="date" id="terapiaInicio" name="terapiaInicio"></div>
                </div>

                <div class="section-subtitle">1. Identificação do Psicólogo(a)</div>
                <div class="form-group">
                    <label>Nome do psicólogo (a):</label>
                    <input type="text" value="${userData.nome}" readonly>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="psicologoPeriodo">Período/Semestre (estagiários):</label><input type="number" id="psicologoPeriodo" name="psicologoPeriodo"></div>
                    <div class="form-group"><label for="psicologoAbordagem">Abordagem teórica:</label><input type="text" id="psicologoAbordagem" name="psicologoAbordagem"></div>
                </div>

                <div class="section-subtitle">2. Identificação do Caso (dados sigilosos)</div>
                <div class="form-group">
                    <label for="pacienteIniciais">Iniciais do(a) paciente:</label>
                    <input type="text" id="pacienteIniciais" name="pacienteIniciais" required placeholder="Campo obrigatório">
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

                <div class="section-title">FASE 1: INÍCIO DA TERAPIA (Sessões 1-8)</div>
                <div class="form-group"><label for="fase1Data">Data do preenchimento:</label><input type="date" id="fase1Data" name="fase1Data"></div>
                <div class="form-group"><label for="fase1Foco">Foco do atendimento:</label><textarea id="fase1Foco" name="fase1Foco" rows="3"></textarea></div>
                <div class="form-group"><label for="fase1Objetivos">Objetivos terapêuticos:</label><textarea id="fase1Objetivos" name="fase1Objetivos" rows="3"></textarea></div>
                <div class="form-group"><label for="fase1Hipoteses">Primeiras hipóteses diagnósticas:</label><textarea id="fase1Hipoteses" name="fase1Hipoteses" rows="3"></textarea></div>
                
                <div class="section-title">FASE 2: MEIO DA TERAPIA (Aprox. 3 meses)</div>
                <div class="form-group"><label for="fase2Data">Data do preenchimento:</label><input type="date" id="fase2Data" name="fase2Data"></div>
                <div class="form-group"><label for="fase2Reavaliacao">Reavaliação do foco:</label><textarea id="fase2Reavaliacao" name="fase2Reavaliacao" rows="3"></textarea></div>
                <div class="form-group"><label for="fase2Progresso">Progresso em direção aos objetivos:</label><textarea id="fase2Progresso" name="fase2Progresso" rows="3"></textarea></div>

                <div class="section-title">FASE 3: PROCESSO DE ALTA (5º e 6º mês)</div>
                <div class="form-group"><label for="fase3Data">Data do preenchimento:</label><input type="date" id="fase3Data" name="fase3Data"></div>
                <div class="form-group"><label for="fase3Avaliacao">Avaliação final dos objetivos:</label><textarea id="fase3Avaliacao" name="fase3Avaliacao" rows="3"></textarea></div>
                <div class="form-group"><label for="fase3Mudancas">Principais mudanças e aprendizados:</label><textarea id="fase3Mudancas" name="fase3Mudancas" rows="3"></textarea></div>
                
                <div class="section-subtitle">Observações Finais</div>
                <div class="form-group"><label for="obsFinais">Observações finais relevantes:</label><textarea id="obsFinais" name="obsFinais" rows="3"></textarea></div>
                <div class="form-group"><label for="dataAlta">Data da alta:</label><input type="date" id="dataAlta" name="dataAlta"></div>
                <div class="form-group"><label for="assinaturaSupervisor">Assinatura do supervisor:</label><input type="text" id="assinaturaSupervisor" name="assinaturaSupervisor"></div>

                <div class="form-actions">
                    <a href="#fichas-supervisao" class="btn btn-secondary">Voltar para Lista</a>
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

    /**
     * Popula o seletor de supervisores com dados do Firestore.
     * @param {object} docData - Dados existentes para pré-selecionar o supervisor.
     */
    async function populateSelects(docData) {
        const supervisorSelect = document.getElementById('supervisorUid');
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

    /**
     * Preenche os campos do formulário com dados existentes.
     * @param {object} data - Dados do documento para preencher.
     */
    function fillForm(data) {
        const form = document.getElementById('ficha-supervisao-form');
        for (const key in data) {
            if (form.elements[key]) {
                form.elements[key].value = data[key];
            }
        }
    }

    /**
     * Lida com o envio do formulário, salvando ou atualizando os dados.
     * @param {Event} e - O evento de submit.
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        data.psicologoUid = user.uid;
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
                window.location.hash = `#fichas-supervisao`;
            } else {
                const docRef = doc(db, 'supervisao', formId);
                await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
                alert("Ficha atualizada com sucesso!");
            }
        } catch (error) {
            console.error("Erro ao salvar a ficha:", error);
            alert("Ocorreu um erro ao salvar.");
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Ficha';
        }
    }

    /**
     * Carrega os dados da ficha (se for edição) ou renderiza um formulário em branco.
     */
    async function load() {
        if (formId === 'new') {
            await renderForm();
        } else {
            const docRef = doc(db, 'supervisao', formId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await renderForm(docSnap.data());
            } else {
                contentArea.innerHTML = '<p class="alert alert-error">Ficha não encontrada.</p>';
            }
        }
    }

    load();
}