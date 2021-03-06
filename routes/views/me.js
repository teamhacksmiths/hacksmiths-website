var keystone = require('keystone'),
	_ = require('underscore'),
	moment = require('moment');

var Event = keystone.list('Event'),
	RSVP = keystone.list('RSVP'),
	SiteWideAlert = keystone.list('SiteWideAlert');

exports = module.exports = function(req, res) {

	var view = new keystone.View(req, res),
		locals = res.locals;

	locals.section = 'me';
	locals.page.title = 'Settings - Hacksmiths';

	view.query('nextEvent',
		Event.model.findOne()
		.where('state', 'active')
		.sort('startDate'));

	view.query('rsvps.history',
		RSVP.model.find()
		.where('who', req.user)
		.where('participating', true)
		.populate('event')
		.sort('-createdAt')
		.populate('author')
	);

	view.on('init', function(next) {
		SiteWideAlert.model.findOne()
			.where('state', 'published')
			.sort('-publishedDate')
			.populate('author')
			.exec(function(error, results){
				if (error || !results) {
					console.log(error);
					next(error);
				} else {
					locals.siteWideAlert = results;
					next();
				}
			});
	});

	view.on('post', {
		action: 'profile.details'
	}, function(next) {

		req.user.getUpdateHandler(req).process(req.body, {
			fields: 'name, email, notifications.events, notifications.posts,' +
				'website, isPublic, bio, photo, availability.isAvailableForEvents, availability.description,' +
				'mentoring.available, mentoring.needsAMentor, mentoring.experience, mentoring.want',
			flashErrors: true
		}, function(err) {

			if (err) {
				return next();
			}

			req.flash('success', 'Your changes have been saved.');
			return next();

		});

	});

	view.on('init', function(next) {

		if (!_.has(req.query, 'disconnect')) return next();

		var serviceName = '';

		switch (req.query.disconnect) {
			case 'github':
				req.user.services.github.isConfigured = null;
				serviceName = 'GitHub';
				break;
			case 'twitter':
				req.user.services.twitter.isConfigured = null;
				serviceName = 'Twitter';
				break;
		}

		req.user.save(function(err) {

			if (err) {
				req.flash('success',
					'The service could not be disconnected, please try again.');
				return next();
			}

			req.flash('success', serviceName +
				' has been successfully disconnected.');
			return res.redirect('/me');

		});

	});

	view.on('post', {
		action: 'profile.password'
	}, function(next) {

		if (!req.body.password || !req.body.password_confirm) {
			req.flash('error', 'Please enter a password.');
			return next();
		}

		req.user.getUpdateHandler(req).process(req.body, {
			fields: 'password',
			flashErrors: true
		}, function(err) {

			if (err) {
				return next();
			}

			req.flash('success', 'Your changes have been saved.');
			return next();

		});

	});

	view.render('site/me');

}
