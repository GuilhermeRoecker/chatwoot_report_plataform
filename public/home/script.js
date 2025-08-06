async function listByCidade(cidade) {
    const response = await fetch(
        `http://localhost:3000/relatorio/cidade/${cidade}`,
        {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        }
    );
    const data = await response.json();
    return data;
}

async function listByUsuario(usuario) {
    const response = await fetch(
        `http://localhost:3000/relatorio/usuario/${usuario}`,
        {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        }
    );
    const data = await response.json();
    return data;
}

async function listByData(dataInicio, dataFim) {
    const response = await fetch(
        `http://localhost:3000/relatorio/data/${dataInicio}/${dataFim}`,
        {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        }
    );
    const data = await response.json();
    return data;
}

async function listAll(cidade, usuario, dataInicio, dataFim) {
    const response = await fetch(
        `http://localhost:3000/relatorio/all/${cidade}/${usuario}/${dataInicio}/${dataFim}`,
        {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        }
    );
    const data = await response.json();
    return data;    
    
}

document.getElementById("btn-buscar").addEventListener("click", async () => {
    const cidade = document.getElementById("cidade").value;
    const usuario = document.getElementById("usuario").value;
    const dataInicio = document.getElementById("data-inicio").value;
    const dataFim = document.getElementById("data-fim").value;

    let resultados = [];

    if (cidade && usuario && dataInicio && dataFim) {
        resultados = await listAll(cidade, usuario, dataInicio, dataFim);
    } else if (cidade) {
        resultados = await listByCidade(cidade);
    } else if (usuario) {
        resultados = await listByUsuario(usuario);
    } else if (dataInicio && dataFim) {
        resultados = await listByData(dataInicio, dataFim);
    } else {
        alert("Preencha ao menos um filtro.");
        return;
    }

    exibirConversas(resultados);
});

function exibirConversas(mensagens) {
    const conversasAgrupadas = {};

    mensagens.forEach(msg => {
        if (!conversasAgrupadas[msg.conversation_id]) {
            conversasAgrupadas[msg.conversation_id] = [];
        }
        conversasAgrupadas[msg.conversation_id].push(msg);
    });

    const listaConversas = document.getElementById("lista-conversas");
    const qtdConversas = Object.keys(conversasAgrupadas).length;

    document.getElementById("quantidade-conversas").innerText = `Conversas encontradas: ${qtdConversas}`;
    listaConversas.innerHTML = "";

    for (const [conversation_id, mensagens] of Object.entries(conversasAgrupadas)) {
        const primeiraMensagem = mensagens[0];

        const li = document.createElement("li");
        li.innerText = `${formatarData(primeiraMensagem.created_at)} - ${primeiraMensagem.sender_name}`;
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
            mostrarChat(conversation_id, conversasAgrupadas[conversation_id]);
        });

        listaConversas.appendChild(li);
    }
}

function formatarData(dataStr) {
    const data = new Date(dataStr);
    return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function mostrarChat(conversationId, mensagens) {
    const chat = document.getElementById("chat");
    chat.innerHTML = `<h3 style="margin-bottom: 15px;">Conversa ID: ${conversationId}</h3>`;

    mensagens.forEach(msg => {
        const div = document.createElement("div");
        div.classList.add("mensagem");

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

        chat.appendChild(div);
    });

    chat.scrollTop = chat.scrollHeight;
}