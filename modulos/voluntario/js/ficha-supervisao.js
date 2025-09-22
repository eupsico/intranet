// eupsico/intranet/modulos/voluntario/js/ficha-supervisao.js

// Declaração das variáveis que serão usadas pelo módulo
let db, user, userData;

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Função Principal (INIT): Chamada para preparar um formulário NOVO.
 */
export function init(dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;

    setTimeout(() => {
        const form = document.getElementById('form-supervisao');
        if (!form) {
            console.error("Erro Crítico: Formulário #form-supervisao não foi encontrado.");
            return;
        }
        setupNovaFicha();
        setupEventListeners();
    }, 0);
}

function setupNovaFicha() {
    document.getElementById('form-supervisao').reset();
    document.getElementById('psicologo-nome').value = userData.nome || '';
    document.getElementById('fase1-data').valueAsDate = new Date();
    document.getElementById('data-supervisao').valueAsDate = new Date();
    document.getElementById('document-id').value = ''; 
    const outraContainer = document.getElementById('outra-abordagem-container');
    if (outraContainer) outraContainer.style.display = 'none';
    loadSupervisores();
}

function setupEventListeners() {
    const form = document.getElementById('form-supervisao');
    const abordagemSelect = document.getElementById('abordagem-teorica');
    const debouncedSave = debounce(autoSalvarFicha, 2000);

    form.addEventListener('input', debouncedSave);
    form.addEventListener('change', debouncedSave);
    
    if (abordagemSelect) {
        abordagemSelect.addEventListener('change', (event) => {
            const outraContainer = document.getElementById('outra-abordagem-container');
            if(outraContainer) outraContainer.style.display = (event.target.value === 'Outra') ? 'block' : 'none';
        });
    }
}

function verificarCamposObrigatorios() {
    const camposObrigatorios = document.querySelectorAll('.required-for-autosave');
    for (const campo of camposObrigatorios) {
        if (!campo.value.trim()) {
            return false; 
        }
    }
    return true;
}

async function loadSupervisores(selectedSupervisorId = null) {
    const select = document.getElementById('supervisor-nome');
    select.innerHTML = '<option value="">Carregando...</option>';
    try {
        const supervisoresQuery = db.collection('usuarios')
            .where('funcoes', 'array-contains', 'supervisor')
            .where('inativo', '==', false);
        const querySnapshot = await supervisoresQuery.get();

        if (querySnapshot.empty) {
            select.innerHTML = '<option value="">Nenhum supervisor encontrado</option>';
            return;
        }

        let options = '<option value="">Selecione um supervisor</option>';
        const supervisores = [];
        querySnapshot.forEach(doc => supervisores.push(doc.data()));
        supervisores.sort((a, b) => a.nome.localeCompare(b.nome));

        supervisores.forEach(supervisor => {
            options += `<option value="${supervisor.uid}" data-nome="${supervisor.nome}">${supervisor.nome}</option>`;
        });

        select.innerHTML = options;
        if (selectedSupervisorId) {
            select.value = selectedSupervisorId;
        }
    } catch (error) {
        console.error("Erro ao carregar supervisores:", error);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function autoSalvarFicha() {
    const statusEl = document.getElementById('autosave-status');
    if (!statusEl) return;

    if (!verificarCamposObrigatorios()) {
        statusEl.textContent = '';
        return;
    }

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = '#31708f';
    
    const supervisorSelect = document.getElementById('supervisor-nome');
    const selectedSupervisorOption = supervisorSelect.options[supervisorSelect.selectedIndex];
    const abordagem = document.getElementById('abordagem-teorica').value;
    const abordagemTexto = abordagem === 'Outra' ? document.getElementById('outra-abordagem-texto').value : abordagem;
    const docId = document.getElementById('document-id').value;

    const formData = {
        lastUpdated: new Date(),
        psicologoUid: user.uid,
        psicologoNome: document.getElementById('psicologo-nome').value,
        identificacaoGeral: { supervisorUid: selectedSupervisorOption.value, supervisorNome: selectedSupervisorOption.dataset.nome, dataSupervisao: document.getElementById('data-supervisao').value, dataInicioTerapia: document.getElementById('data-inicio-terapia').value, },
        identificacaoPsicologo: { periodo: document.getElementById('psicologo-periodo').value, abordagem: abordagemTexto, },
        identificacaoCaso: { iniciais: document.getElementById('paciente-iniciais').value.toUpperCase(), idade: document.getElementById('paciente-idade').value, genero: document.getElementById('paciente-genero').value, numSessoes: document.getElementById('paciente-sessoes').value, queixa: document.getElementById('queixa-demanda').value, },
        fase1: { data: document.getElementById('fase1-data').value, foco: document.getElementById('fase1-foco').value, objetivos: document.getElementById('fase1-objetivos').value, hipoteses: document.getElementById('fase1-hipoteses').value },
        fase2: { data: document.getElementById('fase2-data').value, reavaliacao: document.getElementById('fase2-reavaliacao').value, progresso: document.getElementById('fase2-progresso').value },
        fase3: { data: document.getElementById('fase3-data').value, avaliacao: document.getElementById('fase3-avaliacao').value, mudancas: document.getElementById('fase3-mudancas').value },
        observacoesFinais: { desfecho: document.getElementById('desfecho').value, dataDesfecho: document.getElementById('data-desfecho').value, observacoes: document.getElementById('obs-finais').value },
    };

    try {
        if (docId) {
            await db.collection("fichas-supervisao-casos").doc(docId).set(formData, { merge: true });
        } else {
            const dadosIniciais = { ...formData, criadoEm: new Date() };
            const newDocRef = await db.collection("fichas-supervisao-casos").add(dadosIniciais);
            document.getElementById('document-id').value = newDocRef.id;
        }
        statusEl.textContent = 'Salvo ✓';
        statusEl.style.color = '#3c763d';
    } catch (error) {
        console.error("Erro no salvamento automático:", error);
        statusEl.textContent = 'Erro ao salvar!';
        statusEl.style.color = '#a94442';
    } finally {
        setTimeout(() => {
            if (statusEl.textContent !== 'Salvando...') {
                statusEl.textContent = '';
            }
        }, 3000);
    }
}

/**
 * Função Exportada para Edição: Preenche o formulário com dados existentes.
 */
export async function preencherFormularioExistente(docId, dbRef, userRef, userDataRef) {
    db = dbRef;
    user = userRef;
    userData = userDataRef;
    
    // CORREÇÃO: Pequeno atraso para garantir que o DOM foi renderizado.
    await new Promise(resolve => setTimeout(resolve, 50));

    const form = document.getElementById('form-supervisao');
    if (!form) {
        console.error("Erro Crítico ao Editar: Formulário #form-supervisao não foi encontrado. O HTML pode não ter sido carregado a tempo.");
        return;
    }
    form.reset();
    console.log(`[FICHA-SUPERVISAO] Tentando carregar dados para a ficha ID: ${docId}`);
    
    try {
        const docRef = db.collection("fichas-supervisao-casos").doc(docId);
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("[FICHA-SUPERVISAO] Dados recebidos do Firestore:", data);
            
            document.getElementById('document-id').value = docId;
            document.getElementById('psicologo-nome').value = data.psicologoNome;
            await loadSupervisores(data.identificacaoGeral.supervisorUid);
            
            for (const sectionKey in data) {
                if (typeof data[sectionKey] === 'object' && data[sectionKey] !== null) {
                    for (const fieldKey in data[sectionKey]) {
                        const fieldId = mapDataKeyToFieldId(sectionKey, fieldKey);
                        if (fieldId) {
                            const element = document.getElementById(fieldId);
                            if (element) {
                                element.value = data[sectionKey][fieldKey];
                            } else {
                                console.warn(`[FICHA-SUPERVISAO] Elemento com ID '${fieldId}' não encontrado no formulário.`);
                            }
                        }
                    }
                }
            }
            
            const abordagem = data.identificacaoPsicologo.abordagem;
            const abordagemSelect = document.getElementById('abordagem-teorica');
            const outraContainer = document.getElementById('outra-abordagem-container');
            const outraInput = document.getElementById('outra-abordagem-texto');
            
            const optionExists = [...abordagemSelect.options].some(opt => opt.value === abordagem);
            if (optionExists) {
                abordagemSelect.value = abordagem;
                outraContainer.style.display = 'none';
            } else {
                abordagemSelect.value = 'Outra';
                outraInput.value = abordagem;
                outraContainer.style.display = 'block';
            }
            
            // Ativa os listeners para o salvamento automático da ficha carregada
            setupEventListeners();
        } else {
            throw new Error(`Documento com ID ${docId} não foi encontrado.`);
        }
    } catch (error) {
        console.error("Erro ao carregar ficha existente para edição:", error);
        alert("Ocorreu um erro ao carregar a ficha para edição.");
    }
}

function mapDataKeyToFieldId(section, key) {
    const map = {
        identificacaoGeral: { supervisorUid: 'supervisor-nome', dataSupervisao: 'data-supervisao', dataInicioTerapia: 'data-inicio-terapia' },
        identificacaoPsicologo: { periodo: 'psicologo-periodo' },
        identificacaoCaso: { iniciais: 'paciente-iniciais', idade: 'paciente-idade', genero: 'paciente-genero', numSessoes: 'paciente-sessoes', queixa: 'queixa-demanda' },
        fase1: { data: 'fase1-data', foco: 'fase1-foco', objetivos: 'fase1-objetivos', hipoteses: 'fase1-hipoteses' },
        fase2: { data: 'fase2-data', reavaliacao: 'fase2-reavaliacao', progresso: 'fase2-progresso' },
        fase3: { data: 'fase3-data', avaliacao: 'fase3-avaliacao', mudancas: 'fase3-mudancas' },
        observacoesFinais: { desfecho: 'desfecho', dataDesfecho: 'data-desfecho', observacoes: 'obs-finais' },
    };
    return map[section]?.[key] || null;
}