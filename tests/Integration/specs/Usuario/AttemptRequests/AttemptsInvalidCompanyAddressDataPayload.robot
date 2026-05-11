*** Settings ***
Documentation        Attempt Requests With Invalid Company Billing Data Payload Company Suite

Resource             ../../../../../resources/Base/API.robot

Suite Setup          Run Keywords    User Seed For Attempts Requests
...                                  Build Suite Variables For Attempts With Invalid Company Address Objects

Test Template        Attempt Requests With Invalid Values In Fields Of The Payload

Default Tags         attempts_requests       company_suites

*Variables*
${MOCK_DATA_BUILDER}        Build Company For Mock Requests
${TARGET}                   general

*Test Cases*
01-POST endereco Inválido              authorized  POST    company     endereco   aaaa
...                                    ${HTTP_UNPROCESSABLE_ENTITY}
...                                    O campo endereco deve conter um array com os endereços da empresa
                                        

02-POST CEP Tipo Inválido              authorized  POST    company     endereco   ${endereco_cep_tipo_invalido}
...                                    ${HTTP_UNPROCESSABLE_ENTITY}
...                                    O campo cep deve possuir apenas números.
...                                    cep                                    

03-POST CEP Formato Inválido           authorized  POST    company     endereco   ${endereco_cep_formato_invalido}
...                                    ${HTTP_UNPROCESSABLE_ENTITY}
...                                    O campo cep deve possuir 8 dígitos.
...                                    cep

04-POST Numero Invalido                authorized  POST    company     endereco   ${endereco_numero_tipo_invalido}
...                                    ${HTTP_UNPROCESSABLE_ENTITY}
...                                    O campo número deve possuir apenas números.
...                                    numero

05-POST Numero Caracteres Max          authorized  POST    company     endereco   ${endereco_numero_max_caracteres}
...                                    ${HTTP_UNPROCESSABLE_ENTITY}
...                                    O campo número deve ter no máximo 6 caracteres.
...                                    numero

06-POST ponto_referencia Tipo Invalido           authorized  POST    company     endereco   ${endereco_ponto_referencia_tipo_invalido}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              O campo ponto de referência deve ser string.
...                                              ponto_referencia

07-POST ponto_referencia Caracteres Max          authorized  POST    company     endereco   ${endereco_ponto_referencia_max_caracteres}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              O campo ponto de referência deve ter no máximo 200 caracteres.
...                                              ponto_referencia

08-POST id_cidade Tipo Inválido                  authorized  POST    company     endereco    ${endereco_id_cidade_tipo_invalido}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              O campo cidade deve ser integer.
...                                              id_cidade

09-POST id_cidade Inexistente                    authorized  POST    company     endereco    ${endereco_id_cidade_inexistente}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              A cidade selecionada deve existir previamente na seleção de cidades.
...                                              id_cidade

10-POST id_cidade vazio                          authorized  POST    company     endereco    ${endereco_id_cidade_vazio}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              É obrigatório informar uma cidade.
...                                              id_cidade

11-POST logradouro Tipo Inválido
    [Tags]    with_ic                            #Passar um numero inteiro no logradouro do array de endereco, não está validando o campo corretamente
                                                 authorized  POST    company     endereco    ${logradouro_tipo_invalido}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              O campo Rua/Avenida deve ser string.
...                                              logradouro

12-POST logradouro Caracteres Max                authorized  POST    company     endereco    ${logradouro_max_caracteres}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              O campo Rua/Avenida deve ter no máximo 200 caracteres.
...                                              logradouro

13-POST logradouro Caracteres Min                authorized  POST    company     endereco    ${logradouro_min_caracteres}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              O campo Rua/Avenida deve ter no mínimo 5 caracteres.
...                                              logradouro

14-POST bairro Tipo Inválido                     authorized  POST    company     endereco    ${bairro_tipo_invalido}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              O campo bairro deve ser string.
...                                              bairro

15-POST bairro Caracteres Max                    authorized  POST    company     endereco    ${bairro_max_caracteres}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              O campo bairro deve ter no máximo 200 caracteres.
...                                              bairro

16-POST bairro Caracteres Min                    authorized  POST    company     endereco    ${bairro_min_caracteres}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              O campo bairro deve ter no mínimo 3 caracteres.
...                                              bairro

17-POST descricao sem contato
    [Tags]    with_ic                            #Erro 500 ao informar a descrição do endereço sem contato
                                                 authorized  POST    company     endereco    ${descricaoSemContato}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              A definir
...                                              descricao

18-POST descricao Logradouro Invalido
    [Tags]    with_ic                            #não valida campos de contato     
                                                 authorized  POST    company     endereco    ${contatoEndereco_logradouro_tipo_invalido}
...                                              ${HTTP_UNPROCESSABLE_ENTITY}
...                                              A definir
...                                              contato

#TODO Continuar validação dos campos do array de contato

*keywords*
Build Suite Variables For Attempts With Invalid Company Address Objects
    ${max_int}                  Set Field With Max Integer Number

    ${contatoEndereco}        Create Dictionary                     nome=Responsavel Endereço
    ...                                                             cargo=Desocupado
    ...                                                             email=teste@teste.com
    ...                                                             telefone=47999999988
    ...                                                             telefone_secundario=47999999999
    ...                                                             logradouro=Av. Marcolino martins Cabral
    ...                                                             numero=123
    ...                                                             bairro=Centro
    ...                                                             descricao=Teste Label
    ...                                                             cidade=Tubarao
    ...                                                             cep=88701180

    ${default_dictionary}       Create Dictionary                   cep=88701180
    ...                                                             numero=123
    ...                                                             ponto_referencia=Sala
    ...                                                             id_cidade=10488
    ...                                                             logradouro=Av. Marcolino martins Cabral
    ...                                                             bairro=Centro
    ...                                                             descricao=Teste Label                                                             
    ...                                                             contato=${contatoEndereco}                                                               
       
    Factory Suite Variable For Dictionary List      ${default_dictionary}        endereco_cep_tipo_invalido                     cep                    aaaaaaaa
    Factory Suite Variable For Dictionary List      ${default_dictionary}        endereco_cep_formato_invalido                  cep                    123456789
    Factory Suite Variable For Dictionary List      ${default_dictionary}        endereco_numero_tipo_invalido                  numero                 aaaaaa
    Factory Suite Variable For Dictionary List      ${default_dictionary}        endereco_numero_max_caracteres                 numero                 1234567
    Factory Suite Variable For Dictionary List      ${default_dictionary}        endereco_ponto_referencia_tipo_invalido        ponto_referencia       ${max_int}
    Factory Suite Variable For Dictionary List      ${default_dictionary}        endereco_ponto_referencia_max_caracteres       ponto_referencia       ${256_CHAR}
    Factory Suite Variable For Dictionary List      ${default_dictionary}        endereco_id_cidade_tipo_invalido               id_cidade              a
    Factory Suite Variable For Dictionary List      ${default_dictionary}        endereco_id_cidade_inexistente                 id_cidade              ${max_int}
    Factory Suite Variable For Dictionary List      ${default_dictionary}        endereco_id_cidade_vazio                       id_cidade              ${EMPTY}
    Factory Suite Variable For Dictionary List      ${default_dictionary}        logradouro_tipo_invalido                       logradouro             ${max_int}
    Factory Suite Variable For Dictionary List      ${default_dictionary}        logradouro_max_caracteres                      logradouro             ${256_CHAR}
    Factory Suite Variable For Dictionary List      ${default_dictionary}        logradouro_min_caracteres                      logradouro             a
    Factory Suite Variable For Dictionary List      ${default_dictionary}        bairro_tipo_invalido                           bairro                 ${max_int}
    Factory Suite Variable For Dictionary List      ${default_dictionary}        bairro_max_caracteres                          bairro                 ${256_CHAR}
    Factory Suite Variable For Dictionary List      ${default_dictionary}        bairro_min_caracteres                          bairro                 a

    Factory Suite Variable For Dictionary List      ${default_dictionary}        contato_em_branco                              descricao              Teste
    Factory Suite Variable For Dictionary List      ${default_dictionary}        descricaoSemContato                            contato                ${EMPTY}

    ${logradouro_tipo_invalido}                     Factory Suite Variable For Dictionary      
    ...                                             ${contatoEndereco}           logradouro_tipo_invalido                       logradouro             ${max_int}
    Factory Suite Variable For Dictionary List      ${default_dictionary}        contatoEndereco_logradouro_tipo_invalido       contato                ${logradouro_tipo_invalido}
