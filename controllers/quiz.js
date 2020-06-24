"use strict";
const Sequelize = require('sequelize');
const {models} = require("../models");
const Op = Sequelize.Op;
const paginate = require('../helpers/paginate').paginate;
var ssn;

const {User,Subject,Test,Quiz} = models;


//Autoload quiz asociado a :quizId
exports.load = (req, res, next, quizId) => {

    Quiz.findByPk(quizId)
    .then(quiz => {
        if(quiz){
            req.quiz = quiz;
            next();
        }else{
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};

// MW that allows actions only if the user logged in is admin or is the author of the quiz.
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin  = !!req.session.user.isAdmin;
    const isAuthor = req.quiz.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        next();
    }else{
        console.log('Prohibited operation: The logged in user is not the author of the quiz, nor an administrator.');
        res.send(403);
    }
};


// GET /quizzes
exports.index = (req, res, next) => {
    let countOptions = {
		where: {}
	};
    let title = '';

    //Search quizzes
    const search = req.query.search || '';
    if(search){
		if(search==='choice'){
			countOptions.where = {choice: true};
		}else{
			//Normalizamos texto sustituyendo los blancos por %
			const search_like = "%" + search.replace(/ +/g,"%") + "%";
			//Creamos la expresion de la busqueda
			countOptions.where = {question: { [Op.like]: search_like}};
		}

    }

    if(req.user && search!='friends'){
		countOptions.where.authorId = req.user.id;
		title = req.user.username + "'s Quizzes";
    }

    //Si no hemos buscado nada, muestra todos los quizzes
    Quiz.count(countOptions)
    .then(count => {
      	//Pagination
		const page_items = 5;
		//The page shown is in the query
		const pageno = Number(req.query.pageno) || 1;
		//Create String with HTML to render pagination buttons
		res.locals.paginate_control = paginate(count, page_items, pageno, req.url);

		const findOptions = {
		...countOptions,
		offset: page_items*(pageno-1),
		limit: page_items
		};

		return Quiz.findAll(findOptions);
    }).then(quizzes => {
      res.render('quizzes/index.ejs',{quizzes,search,title});
    })
    .catch(error => next(error));
};


//GET /quizzes/:quizId/play
exports.playQuiz = (req, res, next) => {
	const quiz = req.quiz;
	const testid = quiz.testid
	const subject = quiz.subject;

	Test.findByPk(testid)
	.then(test => {
		if(!quiz){
			res.render(`El quiz ${req.params.quizId} no existe.`);
		}else{
			res.render('quizzes/play.ejs', {subject,test,quiz} );
		}
	})
	.catch(error => {
		req.flash('error', 'Error playing the Quiz: ' + error.message);
		next(error);
	});
};

//PUT /quizzes/:quizId/check
exports.checkQuiz = (req, res, next) => {
	const quiz = req.quiz;
	const answer = req.body.answer;

	let result,name;
	let subject = quiz.subject;

	if(!quiz){
		return res.render(`El quiz ${req.params.quizId} no existe.`);
	}

	if(Number(quiz.answer) === Number(answer)){
		name = 'hits';
		result = 'hit';
	}else{
		name = 'fails';
		result = 'fail';
	}

	Test.findByPk(quiz.testid)
	.then(test => {
		if(req.session.user){
			const userId = req.session.user.id;
			User.findByPk(userId)
			.then(user => {
				user[name]++;
				user.quizzesTried++;
				req.session.user = user;

				user.save({fields: ["quizzesTried","hits","fails"]})
				.then(() => {
					Subject.findByPk(quiz.subject)
					.then(subject => {
						subject[name]++;
						subject.nTries++;

						subject.save({fields: ["nTries","hits","fails"]})
						.then(() => {
							quiz[name]++;
							quiz.nTries++;
							quiz['n'+answer]++;

							quiz.save({fields: ["nTries","hits","fails","n"+answer]})
							.then(() => {
								subject = quiz.subject;
								res.render('quizzes/check.ejs', {subject,test,quiz,result,answer} );
							})
						})
					})
				});
			})
		}else{
			return res.render('quizzes/check.ejs', {subject,test,quiz,result,answer} );
		}
	})
	.catch(error => {
		req.flash('error', 'Error checking the Quiz: ' + error.message);
		next(error);
	});
};

//GET /quizzes/:quizId/edit
exports.editQuiz = (req, res, next) => {
	const quiz = req.quiz;
	const testid = quiz.testid;
	const subject = quiz.subject;

	Test.findByPk(testid)
	.then(test => {
		if(!quiz){
			res.render(`El quiz ${req.params.quizId} no existe.`);
		}else{
			res.render('quizzes/edit.ejs', {subject,test,quiz} );
		}
	})
	.catch(error => {
		req.flash('error', 'Error editing the Quiz: ' + error.message);
		next(error);
	});
};

//PUT /quizzes/:quizId
exports.updateQuiz = (req, res, next) => {
	const id = req.quiz.id;
	let quiz = req.body;
	quiz.id = id;

	if(Number(quiz.answer)>=1 && Number(quiz.answer)<=6){
		Quiz.update(quiz, { where: {id} } )
		.then(() => {
			req.flash('success','Quiz updated succesfully');
			res.redirect('/quizzes');
		}).catch(Sequelize.ValidationError, error => {
			req.flash('error','There are errors in the form:');
			error.errors.forEach(({message}) => req.flash('error',message));
			res.render('quizzes/edit',{quiz});
		}).catch(error => {
			req.flash('error','Error updating the quiz: '+ error.message);
			next(error);
		});
	}else{
		req.flash('error','Errors in choice answers');
		res.render('quizzes/edit',{quiz});
	}
};

//GET /quizzes/:quizId
exports.showQuiz = (req, res, next) => {
	const {quiz} = req;
	const subject = quiz.subject;

	Test.findByPk(quiz.testid)
	.then(test => {
		if(!quiz){
			res.render(`El quiz ${req.params.quizId} no existe.`);
		}else{
			res.render('quizzes/show.ejs', {subject,test,quiz} );
		}
	})
	.catch(error => {
		req.flash('error', 'Error editing the Quiz: ' + error.message);
		next(error);
	});
};

//GET /quizzes/new
exports.newQuiz = (req, res, next) => {
	const quiz = {subject: '', testid: '', question: '', answer: '', answer1: '', answer2: '', answer3: '', answer4: '', answer5: '', answer6: ''};
	res.render('quizzes/new.ejs',{quiz});
};

//POST /quizzes/
exports.addQuiz = (req, res, next) => {
	const {subject,testid,question,answer,answer1,answer2,answer3,answer4,answer5,answer6} = req.body;
	const quiz = {subject,testid,question,answer,answer1,answer2,answer3,answer4,answer5,answer6};

	Test.findByPk(testid)
	.then(test => {
		if(test){
			Quiz.create(quiz)
			.then(() => {
				req.flash('success', 'Quiz added succesfully');
				res.redirect('/quizzes');
			})
		}else{
			req.flash('error', 'No existe el test con el TestId indicado');
			res.render('quizzes/new', {quiz});
		}
	})
	.catch(Sequelize.ValidationError, error => {
		req.flash('error', 'There are errors in the form:');
		error.errors.forEach(({message}) => req.flash('error', message));
		res.render('quizzes/new', {quiz});
	})
	.catch(error => {
		req.flash('error', 'Error adding the Quiz: ' + error.message);
		next(error);
	});
};


//DELETE /quizzes/:quizId
exports.deleteQuiz = (req, res, next) => {
	const quiz = req.quiz;
	quiz.destroy()
	.then(() => {
		req.flash('success', 'Quiz deleted successfully.');
		res.redirect('/goback');
	}).catch(error => {
		req.flash('error', 'Error deleting the Quiz: ' + error.message);
		next(error);
	});
};
