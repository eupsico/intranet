// Arquivo: /modulos/financeiro/js/devedores.js
// Versão: 2.1
// Descrição: Adiciona filtro por profissional e corrige a lógica de busca de dívidas para usar UID.

export function init(db) {
    if (!db) {
        console.error("Instância do Firestore (db) não encontrada.");
        return;
    }

    const appContent = document.getElementById('devedores-content');
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

    const sanitizeKey = (key) => !key ? '' : key.replace(/\.|\$|\[|\]|#|\//g, '_');

    // ALTERAÇÃO: Função de busca de dívida corrigida para usar UID e nome antigo como fallback.
    function getDividaTotal(profissional, DB) {
        const dividaInfo = { valor: 0, meses: [] };
        if (!profissional || !profissional.uid) return dividaInfo;
        
        const profId = profissional.uid;
        const nomeKey_antigo = sanitizeKey(profissional.nome);
        const anoAtual = new Date().getFullYear();
        const mesAtualIndex = new Date().getMonth();

        for (let i = 0; i <= mesAtualIndex; i++) {
            const mes = meses[i];
            
            // Tenta buscar pelo UID primeiro (método novo)
            let dividaDoMes = DB.cobranca?.[anoAtual]?.[profId]?.[mes];
            // Se não encontrar, tenta pelo nome (método antigo)
            if (dividaDoMes === undefined) {
                dividaDoMes = DB.cobranca?.[anoAtual]?.[nomeKey_antigo]?.[mes] || 0;
            }
            
            // Tenta buscar o pagamento pelo UID primeiro
            let pagamentoDoMes = DB.repasses?.[anoAtual]?.[mes]?.[profId];
            // Se não encontrar, tenta pelo nome
            if (pagamentoDoMes === undefined) {
                pagamentoDoMes = DB.repasses?.[anoAtual]?.[mes]?.[nomeKey_antigo];
            }

            if (dividaDoMes > 0 && !pagamentoDoMes) {
                dividaInfo.valor += dividaDoMes;
                dividaInfo.meses.push(mes.charAt(0).toUpperCase() + mes.slice(1));
            }
        }
        return dividaInfo;
    }

    // ALTERAÇÃO: Função de renderização agora aceita um filtro e cria o seletor.
    function renderDevedores(DB, filtroProfissional = 'todos') {
        let devedoresHtml = '';
        
        let profissionaisFiltrados = (DB.profissionais || []).filter(prof => prof.nome && !prof.inativo && !prof.primeiraFase);
        
        // Adiciona o seletor de profissional ao HTML
        devedoresHtml += `
            <div class="filter-box">
                <label for="devedores-profissional-selector"><strong>Filtrar por Profissional:</strong></label>
                <select id="devedores-profissional-selector">
                    <option value="todos">Todos os Devedores</option>
                    ${profissionaisFiltrados
                        .sort((a,b) => a.nome.localeCompare(b.nome))
                        .map(p => `<option value="${p.uid}" ${filtroProfissional === p.uid ? 'selected' : ''}>${p.nome}</option>`)
                        .join('')}
                </select>
            </div>`;

        devedoresHtml += `<div class="table-section"><table id="devedores-table"><thead><tr><th>Profissional</th><th>Meses Pendentes</th><th>Valor Total Devido (R$)</th></tr></thead><tbody>`;
        let totalGeralDevido = 0;
        const listaDevedores = [];

        // Aplica o filtro se um profissional específico for selecionado
        if (filtroProfissional !== 'todos') {
            profissionaisFiltrados = profissionaisFiltrados.filter(p => p.uid === filtroProfissional);
        }

        profissionaisFiltrados.forEach(prof => {
            const dividaInfo = getDividaTotal(prof, DB);
            if (dividaInfo.valor > 0) {
                listaDevedores.push({ nome: prof.nome, meses: dividaInfo.meses.join(', '), valor: dividaInfo.valor });
                totalGeralDevido += dividaInfo.valor;
            }
        });

        listaDevedores.sort((a, b) => b.valor - a.valor);

        if (listaDevedores.length > 0) {
            listaDevedores.forEach(devedor => {
                devedoresHtml += `<tr><td>${devedor.nome}</td><td>${devedor.meses}</td><td>R$ ${devedor.valor.toFixed(2).replace('.',',')}</td></tr>`;
            });
        } else {
            devedoresHtml += `<tr><td colspan="3">Nenhum devedor encontrado para o filtro selecionado.</td></tr>`;
        }
        
        devedoresHtml += `</tbody><tfoot><tr><td colspan="2"><strong>Total Geral Devido</strong></td><td><strong>R$ ${totalGeralDevido.toFixed(2).replace('.',',')}</strong></td></tr></tfoot></table></div>`;
        appContent.innerHTML = devedoresHtml;

        // Adiciona o listener para o filtro
        document.getElementById('devedores-profissional-selector').addEventListener('change', (e) => {
            renderDevedores(DB, e.target.value);
        });
    }

    async function fetchData() {
        appContent.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const [usuariosSnapshot, configSnapshot] = await Promise.all([
                db.collection('usuarios').where("fazAtendimento", "==", true).get(),
                db.collection('financeiro').doc('configuracoes').get()
            ]);

            const DB = {
                profissionais: usuariosSnapshot.docs.map(doc => doc.data()),
                cobranca: configSnapshot.exists ? configSnapshot.data().cobranca : {},
                repasses: configSnapshot.exists ? configSnapshot.data().repasses : {}
            };

            renderDevedores(DB);

        } catch (error) {
            console.error("Erro ao carregar dados para Devedores:", error);
            appContent.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar dados do Firestore.</p>`;
        }
    }

    fetchData();
}