const modal = document.getElementById("config-modal");
const btnConfig = document.getElementById("btn-config");
const closeButton = document.querySelector(".close-button");
const btnAplicarFiltrosModal = document.getElementById("btn-aplicar-filtros-modal");

let currentAgruparPor = 'conversa';
let currentOrdenarPor = 'data';

btnConfig.onclick = function () {
  modal.style.display = "block";
}

closeButton.onclick = function () {
  modal.style.display = "none";
}

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

btnAplicarFiltrosModal.addEventListener("click", () => {
    currentAgruparPor = document.getElementById("agrupar-por").value;
    currentOrdenarPor = document.getElementById("ordenar-por").value;
    exibirConversas(window.conversasCompletas, currentAgruparPor, currentOrdenarPor);
    modal.style.display = "none";
});


function users(){
    window.location.href = '/users';
}
async function buscarConversas() {
    const loadingIndicator = document.getElementById("loading-indicator");
    const btnBuscar = document.getElementById("btn-buscar");

    loadingIndicator.style.display = "block";
    btnBuscar.disabled = true;

    const cidade = document.getElementById("cidade").value;
    const usuario = document.getElementById("usuario").value;
    const dataInicio = document.getElementById("data-inicio").value;
    const dataFim = document.getElementById("data-fim").value;

    const queryParams = new URLSearchParams();
    if (cidade) queryParams.append("cidade", cidade);
    if (usuario) queryParams.append("usuario", usuario);
    if (dataInicio) queryParams.append("dataInicio", dataInicio);
    if (dataFim) queryParams.append("dataFim", dataFim);

    if (!cidade && !usuario && !dataInicio && !dataFim) {
        alert("Preencha ao menos um filtro.");
        loadingIndicator.style.display = "none";
        btnBuscar.disabled = false;
        return;
    }

    try {
        const response = await fetch(`http://192.168.2.115:3000/relatorio?${queryParams.toString()}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
        });
        const resultados = await response.json();
        const conversasProcessadas = preprocessarConversas(resultados);
        window.conversasCompletas = conversasProcessadas;
        exibirConversas(conversasProcessadas);

    } catch (error) {
        console.error("Erro ao buscar conversas:", error);
        alert("Ocorreu um erro ao buscar os dados. Verifique o console para mais detalhes.");
    } finally {
        loadingIndicator.style.display = "none";
        btnBuscar.disabled = false;
    }
}

function preprocessarConversas(mensagens) {
    const conversasOriginais = {};
    mensagens.forEach(msg => {
        if (!conversasOriginais[msg.conversation_id]) {
            conversasOriginais[msg.conversation_id] = [];
        }
        conversasOriginais[msg.conversation_id].push(msg);
    });

    const conversasFinais = [];
    Object.values(conversasOriginais).forEach(conversa => {
        let subConversaAtual = [];
        let subConversaIndex = 0;

        conversa.forEach(msg => {
            subConversaAtual.push({
                ...msg,
                conversation_id: `${msg.conversation_id}-${subConversaIndex}`
            });

            const isResolvedMessage = msg.sender_type === null &&
                                      msg.message_type === 2 &&
                                      msg.processed_message_content?.includes("Conversa foi marcada como resolvida por");

            if (isResolvedMessage && subConversaAtual.length > 0) {
                conversasFinais.push(...subConversaAtual);
                subConversaAtual = [];
                subConversaIndex++;
            }
        });

        if (subConversaAtual.length > 0) {
            conversasFinais.push(...subConversaAtual);
        }
    });

    return conversasFinais;
}

function exibirConversas(mensagens, agruparPor = 'conversa', ordenarPor = 'data') {
    let conversasAgrupadas = agruparConversas(mensagens, agruparPor);
    let chavesOrdenadas = ordenarGrupos(conversasAgrupadas, ordenarPor);

    const listaConversas = document.getElementById("lista-conversas");
    const qtdConversas = Object.keys(conversasAgrupadas).length;

    document.getElementById("quantidade-conversas").innerText = `Grupos encontrados: ${qtdConversas}`;
    listaConversas.innerHTML = "";

    for (const chave of chavesOrdenadas) {
        const mensagensDoGrupo = conversasAgrupadas[chave];
        const primeiraMensagem = mensagensDoGrupo[0];

        const li = document.createElement("li");
        if (agruparPor === 'conversa') {
            const solicitante = mensagensDoGrupo.find(m => m.sender_type === 'Contact' && m.sender_name);
            li.innerText = `${formatarData(primeiraMensagem.created_at)} - ${solicitante ? solicitante.sender_name : 'N/A'}`;
        } else {
            const totalConversas = new Set(mensagensDoGrupo.map(m => m.conversation_id)).size;
            li.innerText = `${chave} (${totalConversas} conversas)`;
        }
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
            const chatContainer = document.getElementById('chat');
            mostrarChat(chave, mensagensDoGrupo);

            const itens = listaConversas.querySelectorAll('li');
            itens.forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
        });

        listaConversas.appendChild(li);
    }
}

function agruparConversas(mensagens, agruparPor) {
    const grupos = {};
    if (!mensagens) return grupos;

    if (agruparPor === 'conversa') {
        mensagens.forEach(msg => {
            if (!grupos[msg.conversation_id]) {
                grupos[msg.conversation_id] = [];
            }
            grupos[msg.conversation_id].push(msg);
        });
        return grupos;
    }

    const conversas = {};
    mensagens.forEach(msg => {
        if (!conversas[msg.conversation_id]) {
            conversas[msg.conversation_id] = [];
        }
        conversas[msg.conversation_id].push(msg);
    });

    for (const id in conversas) {
        const conversaMsgs = conversas[id];
        let chave;
        if (agruparPor === 'cidade') {
            const contato = conversaMsgs.find(m => m.sender_type === 'Contact' && m.cidade);
            chave = (contato && contato.cidade) ? contato.cidade.trim() : 'Sem cidade';
        } else if (agruparPor === 'suporte') {
            const suporte = conversaMsgs.find(m => m.sender_type === 'User');
            chave = suporte ? suporte.sender_name : 'Sem agente';
        } else if (agruparPor === 'solicitante') {
            const solicitante = conversaMsgs.find(m => m.sender_type === 'Contact');
            chave = solicitante ? solicitante.sender_name : 'Sem solicitante';
        }

        if (!grupos[chave]) {
            grupos[chave] = [];
        }
        grupos[chave].push(...conversaMsgs);
    }
    return grupos;
}

function ordenarGrupos(grupos, ordenarPor) {
    let chaves = Object.keys(grupos);
    chaves.sort((a, b) => {
        const grupoA = grupos[a];
        const grupoB = grupos[b];

        if (ordenarPor === 'numero_chats') {
            const totalConversasA = new Set(grupoA.map(m => m.conversation_id)).size;
            const totalConversasB = new Set(grupoB.map(m => m.conversation_id)).size;
            return totalConversasB - totalConversasA;
        } else if (ordenarPor === 'tempo_conversa') {
            const duracaoA = calcularDuracaoTotal(grupoA);
            const duracaoB = calcularDuracaoTotal(grupoB);
            return duracaoB - duracaoA;
        } else { // data (padrão)
            const dataA = new Date(grupoA[0].created_at);
            const dataB = new Date(grupoB[0].created_at);
            return dataB - dataA;
        }
    });
    return chaves;
}

function calcularDuracaoConversa(mensagens) {
    if (mensagens.length < 2) return 0;
    const inicio = new Date(mensagens[0].created_at).getTime();
    const fim = new Date(mensagens[mensagens.length - 1].created_at).getTime();
    return fim - inicio;
}

function calcularDuracaoTotal(mensagens) {
    const conversas = {};
    mensagens.forEach(msg => {
        if (!conversas[msg.conversation_id]) {
            conversas[msg.conversation_id] = [];
        }
        conversas[msg.conversation_id].push(msg);
    });

    let duracaoTotal = 0;
    for (const id in conversas) {
        duracaoTotal += calcularDuracaoConversa(conversas[id]);
    }
    return duracaoTotal;
}

function formatarDuracao(ms) {
    const horas = Math.floor(ms / (1000 * 60 * 60));
    const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((ms % (1000 * 60)) / 1000);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
}

function formatarData(dataStr) {
  const dataUtc = new Date(dataStr);
  const dataCorrigida = new Date(dataUtc.getTime() - 3 * 60 * 60 * 1000);
  return dataCorrigida.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function mostrarChat(conversationId, mensagens) {
    const chat = document.getElementById("chat");
    chat.innerHTML = "";

    mensagens.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    mensagens.forEach(msg => {
        const div = document.createElement("div");
        div.classList.add("mensagem");

        if (msg.private === true) {
            div.style.backgroundColor = "rgb(89, 74, 5)";
        }

        if (msg.sender_type === null && msg.message_type === 2) {
            div.classList.add("mensagem-sistema");
            div.textContent = msg.processed_message_content;

        } else {
            if (msg.sender_type === "Contact") {
                div.classList.add("mensagem-cliente");
            } else {
                div.classList.add("mensagem-suporte");
            }

            const nome = document.createElement("strong");
            nome.textContent = `${msg.sender_name}: `;

            const conteudo = document.createElement("span");
            conteudo.textContent = msg.processed_message_content;

            const data = document.createElement("div");
            data.classList.add("mensagem-data");
            data.textContent = formatarData(msg.created_at);

            div.appendChild(nome);
            div.appendChild(conteudo);
            div.appendChild(data);
        }

        chat.appendChild(div);
    });

    chat.scrollTop = chat.scrollHeight;
}

function imprimir(tipoRelatorio) {
    const grupos = agruparConversas(window.conversasCompletas, currentAgruparPor);
    const chavesOrdenadas = ordenarGrupos(grupos, currentOrdenarPor);

    const printArea = document.createElement("div");
    printArea.className = "print-area";

    let html = `<h2>Relatório de ${tipoRelatorio.charAt(0).toUpperCase() + tipoRelatorio.slice(1)}</h2>`;

    if (tipoRelatorio === 'tma') {
        html += gerarHtmlTMA(chavesOrdenadas, grupos);
    } else if (tipoRelatorio === 'resumo') {
        html += gerarHtmlResumo(chavesOrdenadas, grupos);
    } else if (tipoRelatorio === 'completo') {
        html += gerarHtmlCompleto(chavesOrdenadas, grupos);
    } else if (tipoRelatorio === 'resumo-cidade') {
        const gruposCidade = agruparConversas(window.conversasCompletas, 'cidade');
        const chavesCidade = ordenarGrupos(gruposCidade, 'numero_chats');
        html = `<h2>Resumo por Cidade</h2>`;
        html += gerarHtmlResumoCidade(chavesCidade, gruposCidade);
    }

    printArea.innerHTML = html;
    document.body.appendChild(printArea);
    window.print();
    printArea.remove();
}

function gerarHtmlTMA(chaves, grupos) {
    let ths = '';
    if (currentAgruparPor === 'conversa') {
        ths = '<th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Solicitante</th><th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Atendente</th>';
    } else {
        ths = `<th style="text-align: left; padding: 8px; border: 1px solid #ccc;">${currentAgruparPor.charAt(0).toUpperCase() + currentAgruparPor.slice(1)}</th>
               <th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Cidade(s)</th>`;
    }

    let html = `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
    <thead>
      <tr style="background-color: #333; color: #fff;">
        ${ths}
        <th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Qtd. Conversas</th>
        <th style="text-align: left; padding: 8px; border: 1px solid #ccc;">Tempo Total</th>
        <th style="text-align: left; padding: 8px; border: 1px solid #ccc;">TMA</th>
      </tr>
    </thead>
    <tbody>`;

    for (const chave of chaves) {
        const grupo = grupos[chave];
        const conversasUnicas = new Set(grupo.map(m => m.conversation_id));
        const qtdConversas = conversasUnicas.size;
        const duracaoTotal = calcularDuracaoTotal(grupo);
        const tma = qtdConversas > 0 ? duracaoTotal / qtdConversas : 0;

        html += `<tr>`;
        if (currentAgruparPor === 'conversa') {
            const solicitante = grupo.find(m => m.sender_type === 'Contact')?.sender_name || 'N/A';
            const atendente = grupo.find(m => m.sender_type === 'User')?.sender_name || 'N/A';
            html += `<td style="padding: 8px; border: 2px solid #ccc;">${solicitante}</td>`;
            html += `<td style="padding: 8px; border: 2px solid #ccc;">${atendente}</td>`;
        } else {
            const cidades = [...new Set(grupo.map(m => m.cidade).filter(c => c))].join(', ') || 'N/A';
            html += `<td style="padding: 8px; border: 2px solid #ccc;">${chave}</td>`;
            html += `<td style="padding: 8px; border: 2px solid #ccc;">${cidades}</td>`;
        }
        html += `<td style="padding: 8px; border: 2px solid #ccc;">${qtdConversas}</td>
                 <td style="padding: 8px; border: 2px solid #ccc;">${formatarDuracao(duracaoTotal)}</td>
                 <td style="padding: 8px; border: 2px solid #ccc;">${formatarDuracao(tma)}</td></tr>`;
    }

    html += `</tbody></table>`;
    return html;
}

function gerarHtmlResumo(chaves, grupos) {
    let html = `<p>Total de grupos: ${chaves.length}</p>`;
    html += `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <thead>
      <tr style="background-color: #333; color: #fff;">
        <th style="text-align: left; padding: 8px; border: 5px solid #ccc;">Grupo</th>
        <th style="text-align: left; padding: 8px; border: 5px solid #ccc;">Qtd. Conversas</th>
      </tr>
    </thead>
    <tbody>`;

    for (const chave of chaves) {
        const grupo = grupos[chave];
        const qtdConversas = new Set(grupo.map(m => m.conversation_id)).size;
        html += `<tr>
                    <td style="padding: 8px; border: 5px solid #ccc;">${chave}</td>
                    <td style="padding: 8px; border: 5px solid #ccc;">${qtdConversas}</td>
                 </tr>`;
    }
    html += `</tbody></table>`;
    return html;
}

function gerarHtmlCompleto(chaves, grupos) {
    let html = `<p>Total de grupos: ${chaves.length}</p><br>`;
    for (const chave of chaves) {
        const grupo = grupos[chave];
        html += `<h2>Grupo: ${chave}</h2>`;

        const conversas = agruparConversas(grupo, 'conversa');
        const idsOrdenados = ordenarGrupos(conversas, 'data');

        for(const id of idsOrdenados) {
            const mensagens = conversas[id];
            const primeira = mensagens[0];
            const solicitante = mensagens.find(m => m.sender_type === "Contact" && m.sender_name)?.sender_name || "N/A";
            const atendente = mensagens.find(m => m.sender_type === "User")?.sender_name || "-";

            html += `<h3>${formatarData(primeira.created_at)} - ${solicitante}</h3>`;
            html += `<p><strong>Atendente:</strong> ${atendente}</p>`;

            mensagens.forEach(msg => {
                const tipo = msg.sender_type === "Contact" ? "Cliente" : (msg.sender_type === "User" ? "Suporte" : "Sistema");
                const conteudo = msg.processed_message_content || "";
                const data = formatarData(msg.created_at);

                html += `<div style="margin-bottom: 10px;">
                            <strong>${msg.sender_name} (${tipo})</strong>: ${conteudo}
                            <div style="font-size: 0.8em; color: gray;">${data}</div>
                         </div>`;
            });
            html += `<hr>`;
        }
        html += `<div style="page-break-after: always;"></div>`;
    }
    return html;
}

function gerarHtmlResumoCidade(chaves, grupos) {
    let html = `<p>Total de cidades: ${chaves.length}</p>`;
    html += `<table style="width:100%; border-collapse: collapse; font-size:14px;">
    <thead>
      <tr style="background-color:#333; color:#fff;">
        <th style="padding:8px; border:2px solid #000000ff;">Cidade</th>
        <th style="padding:8px; border:2px solid #000000ff;">Qtd. Chamados</th>
      </tr>
    </thead>
    <tbody>`;

    for (const chave of chaves) {
        const grupo = grupos[chave];
        const qtdConversas = new Set(grupo.map(m => m.conversation_id)).size;
        html += `<tr>
                    <td style="padding:8px; border:2px solid #000000ff;">${chave}</td>
                    <td style="padding:8px; border:2px solid #000000ff; text-align:right;">${qtdConversas}</td>
                 </tr>`;
    }
    html += `</tbody></table>`;
    return html;
}


document.getElementById("btn-imprimir-resumo").addEventListener("click", () => imprimir('resumo'));
document.getElementById("btn-imprimir-resumo-cidade").addEventListener("click", () => imprimir('resumo-cidade'));
document.getElementById("btn-imprimir-completo").addEventListener("click", () => imprimir('completo'));
document.getElementById("btn-imprimir-resumo-tempo").addEventListener("click", () => imprimir('tma'));
document.getElementById("btn-buscar").addEventListener("click", buscarConversas);

// Limpar filtros
document.getElementById("btn-limpar-filtros").addEventListener("click", () => {
    document.getElementById("cidade").value = "";
    document.getElementById("usuario").value = "";
    document.getElementById("data-inicio").value = "";
    document.getElementById("data-fim").value = "";
    document.getElementById("quantidade-conversas").innerText = "";
    document.getElementById("lista-conversas").innerHTML = "";
    window.conversasCompletas = [];
    currentAgruparPor = 'conversa';
    currentOrdenarPor = 'data';
});

// Adiciona busca com a tecla "Enter"
const inputs = document.querySelectorAll("#cidade, #usuario, #data-inicio, #data-fim");
inputs.forEach(input => {
    input.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            buscarConversas();
        }
    });
});