const apiKey = '5f0214d'; 
const boton = document.getElementById('btnBuscar');
const input = document.getElementById('tituloPelicula');
const divResultado = document.getElementById('resultado');

boton.addEventListener('click', () => {
    const titulo = input.value;
    const url = `https://www.omdbapi.com/?t=${titulo}&apikey=${apiKey}`;

    fetch(url)
        .then(respuesta => respuesta.json())
        .then(datos => {
            if (datos.Response === "True") {
                divResultado.innerHTML = `
                    <p><strong>Director:</strong> ${datos.Director}</p>
                    <p><strong>Año:</strong> ${datos.Year}</p>
                `;
            } else {
                divResultado.innerHTML = `<p>No se ha encontrado la película.</p>`;
            }
        })
        .catch(error => console.error('Error en la petición:', error));
});
