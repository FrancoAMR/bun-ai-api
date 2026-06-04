const server = Bun.serve({
    port: process.env.PORT ?? 3000,
    async fetch(req) {
        return new Response("Bun's API is working");
    },
});

console.log(`Server is running on http://localhost:${server.port}`);