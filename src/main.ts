// TODO: continue from https://codelabs.developers.google.com/your-first-webgpu-app#4

// Check if WebGPU is supported in the browser
if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in this browser');
}

const adapter = await navigator.gpu.requestAdapter();

if (!adapter) {
    throw new Error('Failed to request WebGPU adapter');
}

const device = await adapter.requestDevice();

if (!device) {
    throw new Error('Failed to request WebGPU device');
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

// set canvas size to window size
canvas.width = 800;
canvas.height = 600;

const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

if (!context) {
    throw new Error('Failed to get WebGPU context');
}

context.configure({
    device,
    format: canvasFormat,
});

const vertices = new Float32Array([
    //   X,    Y,
    -0.8, -0.8, // Triangle 1 (Blue)
    0.8, -0.8,
    0.8, 0.8,

    -0.8, -0.8, // Triangle 2 (Red)
    0.8, 0.8,
    -0.8, 0.8,
]);

const vertexBuffer = device.createBuffer({
    label: "Cell Vertices",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});

const vertexBufferLayout: GPUVertexBufferLayout = {
    // number of bytes between each vertex
    arrayStride: 8,
    attributes: [
        {
            shaderLocation: 0,
            offset: 0,
            format: "float32x2",
        },
    ],
};

device.queue.writeBuffer(vertexBuffer, 0, vertices);

const cellShaderModule = device.createShaderModule({
    label: "Cell Shader",
    code: `
        @vertex
        fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
            return vec4f(pos, 0.0, 1.0);
        }

        @fragment
        fn fragmentMain() -> @location(0) vec4f {
            return vec4f(1.0, 0.0, 0.0, 1.0);// red
        }
    `,
});

const pipeline = device.createRenderPipeline({
    label: "Cell Pipeline",
    layout: "auto",
    vertex: {
        module: cellShaderModule,
        entryPoint: "vertexMain",
        buffers: [vertexBufferLayout]
    },
    fragment: {
        module: cellShaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: canvasFormat }],
    },
});

const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
    colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.0, g: 0.0, b: 0.4, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
    }]
});

pass.setPipeline(pipeline);
pass.setVertexBuffer(0, vertexBuffer);
pass.draw(vertices.length / 2);
pass.end();

const commandBuffer = encoder.finish();
device.queue.submit([commandBuffer]);