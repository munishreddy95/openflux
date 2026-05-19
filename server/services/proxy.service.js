import http from 'node:http';
import net from 'node:net';

function buildProxyHeaders(headers = {}, controlPort) {
  return {
    ...headers,
    host: `127.0.0.1:${controlPort}`
  };
}

export function createControlHttpProxy(controlPort) {
  return function proxyHttpRequest(request, response, next) {
    const proxyRequest = http.request({
      protocol: 'http:',
      hostname: '127.0.0.1',
      port: controlPort,
      method: request.method,
      path: request.originalUrl || request.url,
      headers: buildProxyHeaders(request.headers, controlPort)
    }, (proxyResponse) => {
      response.status(proxyResponse.statusCode || 502);

      for (const [headerName, headerValue] of Object.entries(proxyResponse.headers)) {
        if (headerValue !== undefined) {
          response.setHeader(headerName, headerValue);
        }
      }

      proxyResponse.pipe(response);
    });

    proxyRequest.on('error', (error) => {
      if (response.headersSent) {
        response.destroy(error);
        return;
      }

      if (typeof next === 'function') {
        next(error);
        return;
      }

      response.status(502).json({
        success: false,
        message: `Control worker is unavailable: ${error.message}`
      });
    });

    request.pipe(proxyRequest);
  };
}

export function proxySocketUpgradeToControl(request, socket, head, controlPort) {
  const upstreamSocket = net.connect(controlPort, '127.0.0.1');

  upstreamSocket.on('connect', () => {
    const requestLine = `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`;
    const headerLines = [];

    for (let index = 0; index < request.rawHeaders.length; index += 2) {
      const headerName = request.rawHeaders[index];
      const headerValue = request.rawHeaders[index + 1];
      const nextValue = headerName.toLowerCase() === 'host'
        ? `127.0.0.1:${controlPort}`
        : headerValue;
      headerLines.push(`${headerName}: ${nextValue}`);
    }

    upstreamSocket.write(`${requestLine}${headerLines.join('\r\n')}\r\n\r\n`);

    if (head?.length) {
      upstreamSocket.write(head);
    }

    socket.pipe(upstreamSocket).pipe(socket);
  });

  upstreamSocket.on('error', () => {
    socket.destroy();
  });

  socket.on('error', () => {
    upstreamSocket.destroy();
  });
}
