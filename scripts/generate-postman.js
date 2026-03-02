const fs = require('fs');
const http = require('http');

const SWAGGER_URL = 'http://localhost:3001/docs-json';
const OUTPUT_FILE = 'postman_collection.json';

console.log('Gerando coleção do Postman a partir do Swagger...');

http.get(SWAGGER_URL, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const swagger = JSON.parse(data);
      const postmanCollection = convertSwaggerToPostman(swagger);
      
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(postmanCollection, null, 2));
      console.log(`✅ Coleção gerada com sucesso: ${OUTPUT_FILE}`);
    } catch (error) {
      console.error('❌ Erro ao processar Swagger:', error.message);
    }
  });
}).on('error', (error) => {
  console.error('❌ Erro ao conectar com a API:', error.message);
  console.log('Certifique-se de que a API está rodando em http://localhost:3001');
});

function convertSwaggerToPostman(swagger) {
  const collection = {
    info: {
      name: swagger.info.title || 'API Collection',
      description: swagger.info.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version: swagger.info.version || '1.0.0'
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3001',
        type: 'string'
      }
    ],
    item: []
  };

  const groupedPaths = {};

  for (const [path, methods] of Object.entries(swagger.paths)) {
    for (const [method, details] of Object.entries(methods)) {
      const tag = details.tags?.[0] || 'Default';
      
      if (!groupedPaths[tag]) {
        groupedPaths[tag] = [];
      }

      const request = {
        name: details.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [],
          url: {
            raw: `{{baseUrl}}${path}`,
            host: ['{{baseUrl}}'],
            path: path.split('/').filter(p => p)
          },
          description: details.description || ''
        },
        response: []
      };

      // Adicionar path variables
      if (path.includes('{')) {
        request.request.url.variable = [];
        const params = path.match(/\{([^}]+)\}/g);
        if (params) {
          params.forEach(param => {
            const paramName = param.replace(/[{}]/g, '');
            request.request.url.variable.push({
              key: paramName,
              value: '00000000-0000-0000-0000-000000000000',
              description: `${paramName} parameter`
            });
          });
        }
      }

      // Adicionar body para POST, PUT, PATCH
      if (['post', 'put', 'patch'].includes(method) && details.requestBody) {
        request.request.header.push({
          key: 'Content-Type',
          value: 'application/json'
        });

        const schema = details.requestBody.content?.['application/json']?.schema;
        if (schema) {
          const example = generateExample(schema, swagger.components?.schemas);
          request.request.body = {
            mode: 'raw',
            raw: JSON.stringify(example, null, 2)
          };
        }
      }

      groupedPaths[tag].push(request);
    }
  }

  // Converter grupos em items da coleção
  for (const [tag, requests] of Object.entries(groupedPaths)) {
    collection.item.push({
      name: tag,
      item: requests
    });
  }

  return collection;
}

function generateExample(schema, components) {
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return generateExample(components[refName], components);
  }

  if (schema.type === 'object' && schema.properties) {
    const example = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      example[key] = generateExampleValue(prop, components);
    }
    return example;
  }

  return generateExampleValue(schema, components);
}

function generateExampleValue(prop, components) {
  if (prop.$ref) {
    const refName = prop.$ref.split('/').pop();
    return generateExample(components[refName], components);
  }

  if (prop.example !== undefined) return prop.example;
  
  switch (prop.type) {
    case 'string':
      if (prop.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      return prop.default || 'string';
    case 'number':
    case 'integer':
      return prop.default || 0;
    case 'boolean':
      return prop.default || false;
    case 'array':
      return [];
    default:
      return null;
  }
}
