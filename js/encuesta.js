(function () {
    "use strict";

    const CLAVE_BIENVENIDA = "la-cabra-oktoberfest-bienvenida-v1";
    const CONFIGURACION = window.LA_CABRA_ENCUESTA_CONFIG || {};
    const ENDPOINT = typeof CONFIGURACION.endpoint === "string"
        ? CONFIGURACION.endpoint.trim()
        : "";
    const MODO_PRUEBA = !/^https://script.google.com/macros/s/.+/exec$/.test(ENDPOINT);

    const bienvenida = document.querySelector("#bienvenida-oktoberfest");
    const encuesta = document.querySelector("#encuesta-oktoberfest");
    const formulario = document.querySelector("#formulario-encuesta");

    if (!bienvenida || !encuesta || !formulario) {
        return;
    }

    const pasos = Array.from(formulario.querySelectorAll("[data-paso]"));
    const botonAnterior = formulario.querySelector("[data-paso-anterior]");
    const botonSiguiente = formulario.querySelector("[data-paso-siguiente]");
    const botonFinalizar = formulario.querySelector("[data-finalizar-prueba]");
    const contador = formulario.querySelector("[data-contador-pregunta]");
    const barra = formulario.querySelector("[data-barra-progreso]");
    const error = formulario.querySelector("[data-error-encuesta]");
    const estadoConexion = formulario.querySelector("[data-estado-conexion]");
    const textoConexion = formulario.querySelector("[data-texto-conexion]");
    let pasoActual = 0;

    function mostrarDialogo(dialogo) {
        if (typeof dialogo.showModal === "function") {
            dialogo.showModal();
            return;
        }

        dialogo.setAttribute("open", "");
    }

    function cerrarDialogo(dialogo) {
        if (typeof dialogo.close === "function") {
            dialogo.close();
            return;
        }

        dialogo.removeAttribute("open");
    }

    function recordarBienvenida() {
        try {
            window.localStorage.setItem(CLAVE_BIENVENIDA, "vista");
        } catch (e) {
            // La navegación privada puede bloquear localStorage; la experiencia continúa igual.
        }
    }

    function bienvenidaYaVista() {
        try {
            return window.localStorage.getItem(CLAVE_BIENVENIDA) === "vista";
        } catch (e) {
            return false;
        }
    }

    function actualizarPaso() {
        pasos.forEach(function (paso, indice) {
            paso.hidden = indice !== pasoActual;
        });

        const numero = pasoActual + 1;
        contador.textContent = "Pregunta " + numero + " de " + pasos.length;
        barra.style.width = (numero / pasos.length) * 100 + "%";
        botonAnterior.hidden = pasoActual === 0;
        botonSiguiente.hidden = pasoActual === pasos.length - 1;
        botonFinalizar.hidden = pasoActual !== pasos.length - 1;
        ocultarError();

        const titulo = pasos[pasoActual].querySelector("legend");
        if (titulo) {
            window.setTimeout(function () {
                titulo.focus({ preventScroll: true });
            }, 0);
        }
    }

    function mostrarError(mensaje) {
        error.textContent = mensaje;
        error.hidden = false;
    }

    function ocultarError() {
        error.textContent = "";
        error.hidden = true;
    }

    function validarPaso() {
        const paso = pasos[pasoActual];
        const numero = pasoActual + 1;

        if (numero === 1 && !paso.querySelector('input[name="localidad"]:checked')) {
            mostrarError("Elegí de qué localidad sos para continuar.");
            return false;
        }

        if (numero === 2 && !paso.querySelector('input[name="difusion"]:checked')) {
            mostrarError("Elegí al menos una opción para continuar.");
            return false;
        }

        if (numero === 3 && !paso.querySelector('input[name="favorito"]:checked')) {
            mostrarError("Elegí al menos una opción para continuar.");
            return false;
        }

        const campoVisible = paso.querySelector("[data-campo-otro]:not([hidden]) input");
        if (campoVisible && !campoVisible.value.trim()) {
            mostrarError("Completá el campo de texto para continuar.");
            campoVisible.focus();
            return false;
        }

        ocultarError();
        return true;
    }

    function actualizarCampoOtro(activador) {
        const identificador = activador.dataset.activaTexto;
        const contenedor = formulario.querySelector('[data-campo-otro="' + identificador + '"]');

        if (!contenedor) {
            return;
        }

        const visible = activador.checked;
        contenedor.hidden = !visible;
        const campo = contenedor.querySelector("input");
        campo.required = visible;

        if (!visible) {
            campo.value = "";
        }
    }

    function sincronizarCamposOtro() {
        formulario.querySelectorAll("[data-activa-texto]").forEach(function (activador) {
            actualizarCampoOtro(activador);
        });
    }

    function prepararConexion() {
        if (MODO_PRUEBA) {
            return;
        }

        estadoConexion.classList.add("aviso-prueba--conectado");
        estadoConexion.querySelector("strong").textContent = "Encuesta anónima";
        textoConexion.textContent = "Al enviar, tus respuestas se guardarán en Google Sheets sin nombre, correo ni teléfono.";
        botonFinalizar.textContent = "Enviar respuestas";
    }

    function obtenerRespuestas() {
        const datos = new FormData(formulario);

        return {
            version: "oktoberfest-v1",
            localidad: datos.get("localidad") || "",
            otra_localidad: (datos.get("otra_localidad") || "").trim(),
            difusion: datos.getAll("difusion"),
            otro_difusion: (datos.get("otro_difusion") || "").trim(),
            favorito: datos.getAll("favorito"),
            otro_favorito: (datos.get("otro_favorito") || "").trim(),
            mejora: (datos.get("mejora") || "").trim()
        };
    }

    async function enviarRespuestas() {
        botonFinalizar.disabled = true;
        botonFinalizar.textContent = "Enviando...";
        ocultarError();

        try {
            const respuesta = await window.fetch(ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(obtenerRespuestas()),
                redirect: "follow"
            });

            if (!respuesta.ok) {
                throw new Error("La hoja no confirmó el envío.");
            }

            mostrarError("¡Gracias! Tus respuestas se guardaron correctamente.");
            botonFinalizar.textContent = "Respuestas enviadas";
            formulario.reset();
            sincronizarCamposOtro();
        } catch (e) {
            mostrarError("No pudimos guardar tus respuestas. Revisá la conexión e intentá de nuevo.");
            botonFinalizar.textContent = "Reintentar envío";
            botonFinalizar.disabled = false;
        }
    }

    document.querySelectorAll("[data-abrir-encuesta]").forEach(function (boton) {
        boton.addEventListener("click", function () {
            pasoActual = 0;
            actualizarPaso();
            mostrarDialogo(encuesta);
        });
    });

    bienvenida.querySelector("[data-responder-encuesta]").addEventListener("click", function () {
        recordarBienvenida();
        cerrarDialogo(bienvenida);
        pasoActual = 0;
        actualizarPaso();
        mostrarDialogo(encuesta);
    });

    bienvenida.querySelector("[data-ver-carta]").addEventListener("click", function () {
        recordarBienvenida();
        cerrarDialogo(bienvenida);
    });

    formulario.querySelector("[data-cerrar-encuesta]").addEventListener("click", function () {
        cerrarDialogo(encuesta);
    });

    botonSiguiente.addEventListener("click", function () {
        if (!validarPaso()) {
            return;
        }

        pasoActual += 1;
        actualizarPaso();
    });

    botonAnterior.addEventListener("click", function () {
        pasoActual = Math.max(0, pasoActual - 1);
        actualizarPaso();
    });

    formulario.addEventListener("change", function (evento) {
        if (evento.target.matches('input[type="radio"], input[type="checkbox"]')) {
            sincronizarCamposOtro();
        }

        ocultarError();
    });

    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        if (!validarPaso()) {
            return;
        }

        if (MODO_PRUEBA) {
            mostrarError("Prueba finalizada: no se envió ni se guardó ninguna respuesta porque Google Sheets todavía no está conectado.");
            botonFinalizar.textContent = "Prueba completada";
            botonFinalizar.disabled = true;
            return;
        }

        await enviarRespuestas();
    });

    encuesta.addEventListener("close", function () {
        botonFinalizar.textContent = MODO_PRUEBA ? "Finalizar prueba" : "Enviar respuestas";
        botonFinalizar.disabled = false;
    });

    [bienvenida, encuesta].forEach(function (dialogo) {
        dialogo.addEventListener("click", function (evento) {
            if (evento.target === dialogo && dialogo === encuesta) {
                cerrarDialogo(dialogo);
            }
        });
    });

    prepararConexion();
    actualizarPaso();

    if (!bienvenidaYaVista()) {
        window.setTimeout(function () {
            mostrarDialogo(bienvenida);
        }, 350);
    }
}());
