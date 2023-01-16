import AdminJS from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import AdminSequelize from '@adminjs/sequelize'
import AdminMongoose from '@adminjs/mongoose';
import express from 'express'

// Models
import { Role } from './models/role.entity';
import { User } from './models/user.entity';
import { Document } from './models/document.entity';

// Controllers
import UserController from './controllers/UserController';

// Routes
import document from "./routes/document";
import auth from "./routes/auth";

import session from 'express-session';//passa a sessão a ser usada pala lib express-mysql-session para cookies e escrever info de sessão no mySQL 
import cors from "cors";

import hbs from "hbs";
const path = require("node:path");//será usado pelo hbs para pegar o caminho do template de e-mail

require('dotenv').config()

const bcrypt = require("bcryptjs");

const mysqlStore = require('express-mysql-session')(session);//precisa da lib express-mysql-session. permite criar sessões dentro do DB mySQL

const { PORT } = process.env; //TODO? Validar se est[a correto no final]

const sessionStore = new mysqlStore({
  connectionLimit: 10,//limite de tempo que guarda o cookie no servidor para manter sessão aberta. Se limite estourar, vai ficar na fila.
  password: process.env.SQL_DB_PASS,
  user: process.env.SQL_DB_USER,
  database: process.env.SQL_DB_NAME,
  host: process.env.SQL_DB_HOST,
  port: process.env.SQL_DB_PORT,
  createDatabaseTable: true //não existe uma tabela de sessão, tem que criar
});

const ROOT_DIR = __dirname;//diretório raiz do projeto. Usado pelo hbs para pegar o caminho do template de e-mail

//Conexão com Bancos de Dados
// https://docs.adminjs.co/installation/adapters/sequelize
  AdminJS.registerAdapter({
    Resource: AdminSequelize.Resource,
    Database: AdminSequelize.Database
  });

  AdminJS.registerAdapter({
    Resource: AdminMongoose.Resource,
    Database: AdminMongoose.Database
  })
// Fim: Conexão com Bancos de Dados

// Constante com filtros padrões do Dashboard AdminJS
const generateResource = (
  Model: object, 
  properties: any = {}, 
  actions: any = {}) => {
  return {
      resource: Model,
      options: {
          properties: {
              ...properties,
              createdAt: {
                  isVisible: {
                      list: true, edit: false, create: false, show: true
                  }
              },
              updatedAt: {
                  isVisible: {
                      list: true, edit: false, create: false, show: true
                  }
              }
          },
          actions: {
              ...actions
          }
      }
  }
}

const start = async () => {
  const app = express()

  // Publicação de imagens (como a logo do Adminjs) com pasta publica. Adminjs só aceita url para resources branding
  app.use(express.static('public'))




  // Código básico mostra quais tabelas de DB irão aparecer no Dashboard do AdminJS
  // Acrescentados filtros para ocultar colunas das tabelas, ou outros recursos
   const adminOptions = {
    resources: [
      generateResource(Role),
      generateResource(
        User, 
        {
            password: {
                type: 'password',
                // Caso queira ocultar o campo password no edit do usuario no Admin.js:
                // isVisible:{
                //   edit:false
                // }
            }
        },
        {
            new: {
              // Antes do "Save" da tela do dashboard: vai encripatar a senha
                before: async(request: any, context: any, actions: any = {}) => {
                    // console.log("ANTES DE SALVAR !!!!!!!!!!")
                  // TODO: Tem que tratar os erros de campos do formulário, pois se der erro ao salvar, a senha abaixo retorna criptografada. Assim no proximo envio será uma senha diferente.
                  if(request.payload.password){
                        request.payload.password = await bcrypt.hashSync(request.payload.password, 10);
                    }
                    return request;
                },
                // Depois do "Save" da tela do dashboard: vai enviar email ao usuário
                after: async(originalResponse: any, request: any, context: any) => {
                    // TODO: Enviar e-mail com acessos ao usuário criado
                    // console.log("DEPOIS DE SALVAR !!!!!!!!!!!")
                    // console.log(originalResponse)
                    // console.log(request.payload)
                    // console.log(context)
                    // console.log(originalResponse.record.params)
                    return originalResponse;
                }
            }
        }
        // TODO: Add Edit (ver doc Adminjs)
        // TODO: Add List (ver doc Adminjs)

    ),
      generateResource(Document)

    ],
    // Dashboard: de components\DashboardComponent.jsx
    dashboard: {
      component: AdminJS.bundle('./components/DashboardComponent')
  },

  // Mudar o caminho da URL do Dashboard:
  // rootPath: '/internal/admin',

  // Só aceita URLs. Criada pasta publica para disponibilizar imagens:
  branding: {
      companyName: 'SW Connect | Documentos Online',
      logo: "/logo.svg",
      favicon: "/favicon.png",
  }
  }

  const admin = new AdminJS(adminOptions)

  // Rotas básicas, sem autenticação:
  // const adminRouter = AdminJSExpress.buildRouter(admin)

  // Rotas com autenticação do AdminJS.
  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
    admin, 
    {
        authenticate: async (email, password) => {        
          //Componente de autenticação a parte (controllers\UserController.ts).
          const userCtrl = new UserController()
            return await userCtrl.login(email, password); 
        },
        cookieName: 'adminjs-internal-admin',// Forma de salvar dentro da aplicação as informações de sessão do usuario. Criar um nome:
        cookiePassword: '5E8vsHT1i4KXbn8hULxa8&^4xP^JR@7A'// Criar senha aleatória
    },
    null,
    {
        // Criar cookie / ondigurações da sessão
        store: sessionStore, //Constante criada anteriormente, recebe função da lib express-mysql-session. permite criar sessões dentro do DB mySQL
        resave: true,//resalvar o cookie para não ser "chutado" para fora da app
        saveUninitialized: true,//salvar ao parar a aplicação
        secret: 'B9z+!AH7k)UECV^7f!d)4^KV?CM}(.!.dSV+-cPCFJw2yN11I"v209O>k8KWkO}',//gerar chave aleatória (ex: randomkeygen.com opção 504-bit WPA Key)
        cookie:{
            httpOnly: process.env.NOD_ENV !== 'production',//vai permitir http apenas se a varial de ambiente não for igual a produção.
            secure: process.env.NOD_ENV === 'production' //vai obrigar o uso de https em ambiente de produção
        },
        name: 'adminjs-internal-admin' //Nome das configuração do cookie. Usamos igual ao cookieName.
    }
)


  app.use(cors());
  app.use(express.json());
  hbs.registerPartials(path.join(ROOT_DIR, "views"));//resgistra o caminho das views, dos templates HTML de emails + concatenar com o caminho da pasta views para gerar o caminho completo
  app.set("view engine", ".hbs");


  app.use(admin.options.rootPath, adminRouter)
  app.use('/document', document)
  app.use('/auth', auth)




  app.get('/', (req, res) => {
    res.send('Api is runnning')
  })

  app.listen(PORT, () => {
    console.log(`AdminJS started on http://localhost:${PORT}${admin.options.rootPath}`);
  });
};

start();