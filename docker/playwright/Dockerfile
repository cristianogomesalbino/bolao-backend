FROM mcr.microsoft.com/playwright:v1.48.0-jammy

ENV TZ=America/Sao_Paulo
ENV LANG=pt_BR.UTF-8

WORKDIR /opt/tests

# Instala PostgreSQL client, locales e Java (para Allure CLI)
RUN apt-get update && apt-get install -y \
    postgresql-client \
    locales \
    default-jre-headless \
    && sed -i -e 's/# pt_BR.UTF-8 UTF-8/pt_BR.UTF-8 UTF-8/' /etc/locale.gen \
    && dpkg-reconfigure --frontend=noninteractive locales \
    && update-locale LANG=pt_BR.UTF-8 \
    && rm -rf /var/lib/apt/lists/*

COPY tests/Integration/package.json ./
RUN npm install

COPY tests/Integration/ ./

# Cria diretórios de output com permissão aberta
RUN mkdir -p /opt/tests/results/allure-results \
             /opt/tests/results/allure-report \
             /opt/tests/results/html \
             /opt/tests/test-results \
    && chmod -R 777 /opt/tests/results /opt/tests/test-results

CMD ["npx", "playwright", "test"]
