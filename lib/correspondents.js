// Exports
module.exports.builder = builder;
module.exports.handler = handler;

const client = require('./utils/client');
const pager = require('./utils/pager');
const moment = require('moment');
const kgo = require('kgo');

function builder (yargs) {
	yargs
		.usage('\nUsage: tw correspondents')
		.describe('duration', 'How far back to look for correspondents')
		.default('duration', '1-week')
		.alias('duration', 'd');

	return yargs;
}

function handler (yargs) {
	var earlier, duration, users;

	users = [];
	duration = yargs.duration.split('-');
	earlier = moment().subtract(+duration[0] || 1, duration[1] || 'weeks');
	kgo
	('timeline', (done) => {
		pager(
			client,
			'statuses/user_timeline',
			{count: 200},
			compile(done),
			stop
		);
	})
	('favourites', (done) => {
		pager(
			client,
			'favorites/list',
			{count: 200},
			compile(done),
			stop
		);
	})
	('final', ['timeline', 'favourites'], (timeline, favourites, done) => {
		timeline.concat(favourites).reduce((t,i)=>{
			if (t.indexOf(i) === -1) {
				t.push(i);
			}
			return t;
		},[]).forEach((name)=>console.log(name));
	});

	function stop(res) {
		return moment(res[res.length-1].created_at, 'ddd MMM DD HH:mm:ss ZZ YYYY') < earlier;
	}

	function compile (done) {
		return function (err, res) {
			if (err) return done(err);

			done(null, res
				.filter((r)=>{
					return moment(r.created_at, 'ddd MMM DD HH:mm:ss ZZ YYYY') >= earlier &&
						(!!r.retweeted_status || !!r.quoted_status || r.in_reply_to_screen_name);
				})
				.reduce((t,r)=>{
					if (r.retweeted_status) t.push(r.retweeted_status.user.screen_name);
					if (r.quoted_status) t.push(r.quoted_status.user.screen_name);
					if (r.in_reply_to_screen_name) t.push(r.in_reply_to_screen_name);
					r.entities.user_mentions.forEach((mention)=>{
						t.push(mention.screen_name);
					});
					return t;
				}, [])
			);
		};
	}
}
