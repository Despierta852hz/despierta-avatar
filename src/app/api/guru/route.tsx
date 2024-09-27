import { NextRequest, NextResponse } from "next/server";
import axios from 'axios';

// Verificar si el correo del usuario es el del administrador
function isAdmin(email: string): boolean { 
    return email === "miguel.neumann@gmail.com"; // Cambia si hay más administradores
}

// Obtener productos desde Wix Stores y enviar recomendaciones
async function getProducts() {
    const apiKey = process.env.ZenAPIKey; // Clave API de Wix desde las variables de entorno
    const response = await axios.get('https://www.wixapis.com/stores/v2/products', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    // Mapeamos los productos para extraer solo la información que necesitamos
    const products = response.data.products.map((product: any) => ({
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.media[0]?.url, // La primera imagen del producto
        productUrl: `https://despierta.online/product/${product.slug}` // URL del producto en tu tienda
    }));

    return products;
}

// Función para actualizar un producto (solo admin)
async function updateProduct(productId: string, updatedData: any) {
    const apiKey = process.env.ZenAPIKey;
    const response = await axios.put(`https://www.wixapis.com/stores/v2/products/${productId}`, updatedData, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.data;
}

// Función para crear un nuevo producto (solo admin)
async function createProduct(newProductData: any) {
    const apiKey = process.env.ZenAPIKey;
    const response = await axios.post('https://www.wixapis.com/stores/v2/products', newProductData, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.data;
}

// Función para eliminar un producto (solo admin)
async function deleteProduct(productId: string) {
    const apiKey = process.env.ZenAPIKey;
    const response = await axios.delete(`https://www.wixapis.com/stores/v2/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.data;
}

// Obtener disponibilidad de servicios (reservas)
async function getAvailability(serviceId: string) {
    const apiKey = process.env.ZenAPIKey;
    const response = await axios.get(`https://www.wixapis.com/bookings/v2/availability/${serviceId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.data;
}

// Crear una nueva reserva (disponible para usuarios y admin)
async function createBooking(bookingData: any) {
    const apiKey = process.env.ZenAPIKey;
    const response = await axios.post('https://www.wixapis.com/bookings/v2/bookings', bookingData, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.data;
}

// Reprogramar o cancelar una reserva (solo admin)
async function updateBooking(bookingId: string, updatedData: any) {
    const apiKey = process.env.ZenAPIKey;
    const response = await axios.put(`https://www.wixapis.com/bookings/v2/bookings/${bookingId}`, updatedData, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.data;
}

// Crear o actualizar eventos (solo admin)
async function createOrUpdateEvent(eventId: string, eventData: any) {
    const apiKey = process.env.ZenAPIKey;
    const response = await axios.put(`https://www.wixapis.com/events/v2/events/${eventId}`, eventData, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.data;
}

// Eliminar eventos (solo admin)
async function deleteEvent(eventId: string) {
    const apiKey = process.env.ZenAPIKey;
    const response = await axios.delete(`https://www.wixapis.com/events/v2/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.data;
}

// Función principal que gestiona las peticiones del chatbot
export async function POST(req: NextRequest) {
    const { email, query } = await req.json(); // Extraer el correo y la consulta del cuerpo de la petición
    const userIsAdmin = isAdmin(email);

    // Respuesta para el administrador
    if (userIsAdmin) {
        return NextResponse.json({
            message: "¡Bienvenido, Administrador! ¿Qué deseas gestionar hoy?",
            canManageProducts: true,
            canManageBookings: true,
            canManageEvents: true
        });
    }

    // Si es un usuario regular, obtener productos y recomendarlos
    const products = await getProducts();
    return NextResponse.json({
        message: "¡Hola! Aquí tienes algunos productos que te podrían interesar:",
        recommendations: products.map(product => ({
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            productUrl: product.productUrl
        })),
        callToAction: "Haz clic en el enlace para ver más detalles y hacer tu compra."
    });
}
