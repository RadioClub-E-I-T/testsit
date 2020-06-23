const path = require('path');
const Sequelize = require('sequelize');

//Heroku Postgres DB or SQLite DB
const url = process.env.DATABASE_URL || "sqlite:quiz.sqlite";
const options = {
                  define: {
                    charset: 'utf8',
                    dialectOptions: {
                      collate: 'utf8_general_ci'
                    }
                  },
                  logging: false
                };
const sequelize = new Sequelize(url, options);

// Subject
sequelize.import(path.join(__dirname,'subject'));

// Test
sequelize.import(path.join(__dirname,'test'));

// Quiz
sequelize.import(path.join(__dirname, 'quiz'));

// User
sequelize.import(path.join(__dirname,'user'));

// Emails
sequelize.import(path.join(__dirname,'email'));

// Session
sequelize.import(path.join(__dirname,'session'));

//Charge models
const {Subject,Test,Quiz,User,Email,session} = sequelize.models;

// Relation 1-to-1 between Email and User:
User.belongsTo(Email, {foreignKey: 'email'});
Email.belongsTo(User, {foreignKey: 'username'});

// Relation 1-to-N between Test and Quizzes:
Test.hasMany(Quiz, {foreignKey: 'testid', as: 'quizzes'});
Quiz.belongsTo(Test, {as: 'test', foreignKey: 'testid'});

// Relation 1-to-N between Subject and Tests:
Subject.hasMany(Test, {foreignKey: 'subject', as: 'tests'});
Test.belongsTo(Subject, {foreignKey: 'subject'});

// Relation 1-to-N between Subject and Quizzes:
Subject.hasMany(Quiz, {foreignKey: 'subject', as: 'quizzes'});
Quiz.belongsTo(Subject, {foreignKey: 'subject'});


module.exports = sequelize;
