/**
 * Utilitários para manipulação de números
 */

/**
 * Formata um número para o padrão brasileiro (1.234,56)
 * @param {number} valor - O número a ser formatado
 * @param {number} casasDecimais - Número de casas decimais (padrão: 2)
 * @returns {string} Número formatado como string
 */
function formatarNumero(valor, casasDecimais = 2) {
    if (isNaN(valor)) return '0,00';
    
    return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: casasDecimais,
        maximumFractionDigits: casasDecimais
    });
}

/**
 * Converte uma string no formato brasileiro para número
 * @param {string} valor - String no formato "1.234,56"
 * @returns {number} Número convertido
 */
function parseNumero(valor) {
    if (!valor) return 0;
    
    // Remove pontos de milhar e substitui vírgula por ponto
    const numero = valor
        .replace(/\./g, '')
        .replace(',', '.');
        
    return parseFloat(numero) || 0;
}

/**
 * Formata um número para moeda brasileira (R$)
 * @param {number} valor - Valor a ser formatado
 * @param {number} casasDecimais - Número de casas decimais (padrão: 2)
 * @returns {string} Valor formatado como moeda
 */
function formatarMoeda(valor, casasDecimais = 2) {
    if (isNaN(valor)) return 'R$ 0,00';
    
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: casasDecimais,
        maximumFractionDigits: casasDecimais
    });
}

/**
 * Calcula a porcentagem de um valor
 * @param {number} valor - Valor base
 * @param {number} porcentagem - Porcentagem a ser calculada
 * @returns {number} Resultado do cálculo
 */
function calcularPorcentagem(valor, porcentagem) {
    return (valor * porcentagem) / 100;
}

/**
 * Gera um número aleatório dentro de um intervalo
 * @param {number} min - Valor mínimo (inclusivo)
 * @param {number} max - Valor máximo (inclusivo)
 * @returns {number} Número aleatório gerado
 */
function numeroAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export {
    formatarNumero,
    parseNumero,
    formatarMoeda,
    calcularPorcentagem,
    numeroAleatorio
};
