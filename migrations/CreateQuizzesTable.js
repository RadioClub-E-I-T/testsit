'use strict';

module.exports = {
  up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'Quizzes',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            unique: true
          },
          testid: {
              type: Sequelize.STRING,
              validate: {notEmpty: {msg: "Subject must not be empty"}}
          },
          subject: {
              type: Sequelize.STRING,
              validate: {notEmpty: {msg: "Subject must not be empty"}}
          },
          question: {
              type: Sequelize.TEXT,
              validate: {notEmpty: {msg: "Question must not be empty."}}
          },
          image: Sequelize.STRING,
          answer: {
              type: Sequelize.INTEGER,
              validate: {notEmpty: {msg: "Answer must not be empty."}}
          },
          answer1: Sequelize.STRING,
          answer2: Sequelize.STRING,
          answer3: Sequelize.STRING,
          answer4: Sequelize.STRING,
          answer5: Sequelize.STRING,
          answer6: Sequelize.STRING,
          nTries: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: '0'
          },
          hits: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: '0'
          },
          fails: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: '0'
          },
          omissions: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: '0'
          },
          n1: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: '0'
          },
          n2: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: '0'
          },
          n3: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: '0'
          },
          n4: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: '0'
          },
          n5: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: '0'
          },
          n6: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: '0'
          },
          createdAt: {
              type: Sequelize.DATE,
              allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false
          }
        },
        {
          sync: {force: true},
          charset: 'utf8',
          collate: 'utf8_general_ci'
        }
    );
  },
  down(queryInterface, Sequelize) {
    return queryInterface.dropTable('Quizzes');
  }
};
