document.getElementById('btnBuscar').addEventListener('click', function() {
    const titulo = document.getElementById('tituloPelicula').value;
    const resultadoDiv = document.getElementById('resultado');
    const apiKey = '5f0214d'; 
    const url = `https://www.omdbapi.com/?t=${titulo}&apikey=${apiKey}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.Response === "True") {
                resultadoDiv.innerHTML = `Director: ${data.Director} <br> Año: ${data.Year}`;
            } else {
                resultadoDiv.innerHTML = `Error: Película no encontrada.`;
            }
        })
        .catch(error => {
            console.error('Error al realizar la petición:', error);
            resultadoDiv.innerHTML = 'Hubo un error de conexión.';
        });
});
