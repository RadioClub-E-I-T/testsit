"use strict";
const Sequelize = require('sequelize');
const {models} = require("../models");
const Op = Sequelize.Op;
const paginate = require('../helpers/paginate').paginate;
var ssn;

const {User,Subject,Test,Quiz} = models;

//GET /tests/:subject
//Cargar todos los quizzes que pertenezcan a una asignatura, y,
//a partir de ellos formar un array que contenga todas las distintas
//descripciones de estos, que se mostrarán en una lista.
exports.subjectTests = (req, res, next) => {
  const subject = req.params.subject;

  Test.findAll({
    where: {subject: subject}
  }).then(tests => {
    res.render('tests/subject_tests.ejs', {subject,tests} );
  }).catch(error => {
    req.flash('error', 'Error showing subject tests: ' + error.message);
    next(error);
  });
};

//GET /tests/:subject/:testid
//Se deben precargar todas las preguntas que pertenezcan a un testid y
//asignatura en una lista, que se deberá mostrar posteriormente como si de un
//test de moodle se tratase, para finalmente ser corregidas
exports.playTest = (req, res, next) => {
  const subject = req.params.subject;
  const testid = req.params.testid;

  Test.findByPk(testid, 
    {include: ['quizzes']}
  ).then(test => {
    req.session.test = test;
    res.render('tests/play_test.ejs', {subject,test} );
  }).catch(error => {
    req.flash('error', 'Error showing subject tests: ' + error.message);
    next(error);
  });
};

//PUT /tests/:subject/:testid
//Se encarga de comprobar que las preguntas del tests son correctas, incorrectas, o no contestadas;
//a partir del array del test guardado como dato de la sesion, debe dar paso a una vista donde se muestren
//las preguntas en rojo si hemos fallado y en verde si acertamos, la puntuación total etc
exports.checkTest = async (req, res, next) => {
  const test = req.session.test;
  const {subject,testid} = req.params;

  let correct = 0;
  let incorrect = 0;
  let nonanswered = 0;
  
  let answers = req.body;
  let N = Object.keys(test.quizzes).length;

  for (var i = 0; i < N; i++) {
    var omission = 0;
    var hit = 0;
    var fail = 0;
    var answer_sel = Number(answers['answer'+ i]);

    test.quizzes[i].nTries++;
    test.quizzes[i]['n'+answer_sel]++;
    if(answer_sel === 0){
      test.quizzes[i].result = 'na';
      test.quizzes[i].omissions++;
      nonanswered++;
      omission = 1;
    }else if(answer_sel === Number(test.quizzes[i].answer)){
      test.quizzes[i].result = 'hit';
      test.quizzes[i].hits++;
      correct++;
      hit = 1;
    }else if(answer_sel !== Number(test.quizzes[i].answer)){
      test.quizzes[i].result = 'fail';
      test.quizzes[i].fails++;
      incorrect++;
      fail = 1;
    }

    await Quiz.findByPk(test.quizzes[i].id)
    .then(quiz => {
      quiz.nTries++;
      quiz.hits += hit;
      quiz.fails += fail;
      quiz.omissions += omission;
      quiz['n'+answer_sel]++;
      quiz.save({fields: ["nTries","hits","fails","omissions","n"+answer_sel]})
    });
  }

  //Test stats
  test.nTries++;
  test.hits += correct;
  test.fails += incorrect;
  test.omissions += nonanswered;

  Test.findByPk(testid)
  .then(test_to_update => {
    test_to_update.nTries++;
    test_to_update.hits += correct;
    test_to_update.fails += incorrect;
    test_to_update.omissions += nonanswered;

    test_to_update.save({fields: ["nTries","hits","fails","omissions"]})
    .then(() => {
      const userId = req.session.user.id;
      User.findByPk(userId)
      .then(user => {
        user.hits += correct;
        user.fails += incorrect;
        user.omissions += nonanswered;
        user.testsTried++;
        req.session.user = user;

        user.save({fields: ["testsTried","hits","fails","omissions"]})
        .then(() => {
          Subject.findByPk(subject)
          .then(subject => {
            subject.hits += correct;
            subject.fails += incorrect;
            subject.omissions += nonanswered;
            subject.nTries++;

            subject.save({fields: ["nTries","hits","fails","omissions"]})
            .then(() => {
              subject = subject.subject;
              res.render('tests/result_test.ejs', {test,answers,subject,correct,incorrect,nonanswered} );
            });
          });
        });
      });
    });
  })
	.catch(error => {
		req.flash('error', 'Error checking the Test: ' + error.message);
		next(error);
	});
  
};

//GET /tests/:subject/:desc/solved
//Carga el test con sus respuestas correctas
exports.solvedTest = (req, res, next) => {
  const subject = req.params.subject;
  const testid = req.params.testid;

  Test.findByPk(testid, 
    {include: ['quizzes']}
  ).then(test => {
    res.render('tests/solved_test.ejs', {subject,test} );
  })
  .catch(error => {
    req.flash('error', 'Error showing subject tests: ' + error.message);
    next(error);
  });
};


//GET /edittest/:subject/:testid
//Devuelve el form para editar el test
exports.editTestForm = (req, res, next) => {
  const subject = req.params.subject;
  const testid = req.params.testid;

  Test.findByPk(testid, 
    {include: ['quizzes']}
  ).then(test => {
    let npreg = Object.keys(test.quizzes).length;
    
    res.render('tests/edittest.ejs', {subject,test,npreg} );
  })
  .catch(error => {
    req.flash('error', 'Error showing subject tests: ' + error.message);
    next(error);
  });
};


//POST /edittest/:subject/:testid
exports.editTest = (req, res, next) => {
  const {subject,testid} = req.params;

  const new_testid = req.body.testid;
  const {desc,year,month} = req.body;

  const {question,answer,answer1,answer2,answer3,answer4,answer5,answer6} = req.body;

  //Build test instance
  const test = Test.build({
    testid: new_testid,
    subject: subject, 
    desc: desc,
    year: year,
    month: month
  })

  //Create quizzes
  let quizzes = [];
  for (var i in question){
    let quiz = {
      testid: new_testid,
      subject: subject,
      question: question[i],
      answer: Number(answer[i]),
      answer1: answer1[i],
      answer2: answer2[i],
      answer3: answer3[i],
      answer4: answer4[i],
      answer5: answer5[i],
      answer6: answer6[i]
    }
    quizzes.push(quiz);
  }

  Test.destroy(
    {where: {testid: testid}
  }).then( () => {
    Quiz.destroy(
      {where: {testid: testid}
    }).then( () => {
      test.save()
      .then( () => {
        Quiz.bulkCreate(quizzes)
        .then(() => {
          req.flash('success', 'Test updated succesfully');
          res.redirect('/tests/' + subject + '/' + new_testid + '/solved');
        })
      })
    })
  })
  .catch(Sequelize.ValidationError, error => {
    req.flash('error', 'There are errors in the form:');
    error.errors.forEach(({message}) => req.flash('error', message));
    res.render('tests/edittest.ejs', {subject,test,npreg} );
  })
  .catch(error => {
		req.flash('error', 'Error updating the Test: ' + error.message);
		next(error);
	});
};


//GET /newtest/:subject/
//Indicamos campos comunes del test: id, año, mes, descripción y número de preguntas. 
exports.addTestForm = (req, res, next) => {
  const subject = req.params.subject;
	res.render('tests/newtest.ejs', {subject} );
};


//POST /newtest/:subject/
//Indicamos campos comunes del test: id, año, mes, descripción y número de preguntas. 
exports.addTestQuestions = (req, res, next) => {
  const subject = req.params.subject;
  const {testid,year,month,desc,npreg,noptions} = req.body;

  Test.findByPk(testid)
  .then(test => {
    if(!test){
      res.render('tests/addtest.ejs', {subject,testid,year,month,desc,npreg,noptions} );
    }else{
      req.flash('error', 'TestId already exists');
      res.render('tests/newtest.ejs', {subject} );
    }
  })
  .catch(error => {
		req.flash('error', 'Error creating the new test form: ' + error.message);
		next(error);
	});
	
};


//POST /addtest/:subject/
exports.addTest = (req, res, next) => {
  const {subject} = req.params;
  const {testid,desc,year,month} = req.body;
  const noptions = Number(req.body.noptions);

  const {question,answer} = req.body;
  let {answer1,answer2,answer3,answer4,answer5,answer6} = req.body; 

  let npreg = question.length;
  let empty_answers = new Array(npreg); 
  for (var i = 0; i < npreg; i++) empty_answers[i] = '';

  if(noptions < 3){
    answer3 = empty_answers;
  }
  if(noptions < 4){
    answer4 = empty_answers;
  }
  if(noptions < 5){
    answer5 = empty_answers;
  }
  if(noptions < 6){
    answer6 = empty_answers;
  }

  //Build test instance
  const test = Test.build({
    testid: testid,
    subject: subject, 
    desc: desc,
    year: year,
    month: month
  })

  //Create test
  let quizzes = [];
  for (var i in question){
    let quiz = {
      testid: testid,
      subject: subject,
      question: question[i],
      answer: Number(answer[i]),
      answer1: answer1[i],
      answer2: answer2[i],
      answer3: answer3[i],
      answer4: answer4[i],
      answer5: answer5[i],
      answer6: answer6[i]
    }
    quizzes.push(quiz);
  }

  test.save()
  .then( () => {
    Quiz.bulkCreate(quizzes)
    .then(() => {
      req.flash('success', 'Test added succesfully');
      res.redirect('/tests/' + subject + '/' + testid + '/solved');
    })
  })
  .catch(Sequelize.ValidationError, error => {
    req.flash('error', 'There are errors in the form:');
    error.errors.forEach(({message}) => req.flash('error', message));
    res.render('tests/addtest.ejs', {subject,testid,year,month,desc,npreg,noptions} );
  })
  .catch(error => {
    req.flash('error', 'Error adding the Quiz: ' + error.message);
    next(error);
  });
};

//DEL /tests/:subject/:testid
exports.deleteTest = (req, res, next) => {
    const subject = req.params.subject;
    const testid = req.params.testid;

    Test.destroy({where: {testid: testid}})
    .then(() => {
        Quiz.destroy({where: {testid: testid}})
        .then(() => {
          req.flash('success', 'Test deleted successfully.');
          res.redirect('/tests/' + subject);
        })
    })
    .catch(error => {
      req.flash('error', 'Error deleting the Test: ' + error.message);
      next(error);
    });
};