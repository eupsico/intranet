/**
 * Carrega o conteúdo de um arquivo HTML.
 * @param {string} file O nome do arquivo a ser carregado (ex: 'dashboard.html').
 * @param {string} basePath O caminho base a partir do diretório de scripts (padrão: '../page/').
 * @returns {Promise<string>} O conteúdo do arquivo como texto.
 */
export async function loadHTML(file, basePath = '../page/') {
    const response = await fetch(`${basePath}${file}`);
    if (!response.ok) {
        throw new Error(`Erro ao carregar o arquivo HTML: ${file}`);
    }
    return await response.text();
}