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