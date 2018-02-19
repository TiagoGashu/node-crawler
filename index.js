var Crawler = require("crawler");
const express = require('express')
const app = express()
const port = 3000
const globalQueue = [];

const HTTP_FORMAT = 'http://'
const HTTPS_FORMAT = 'https://'

// middleware para permitirmos CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

function mangaChapters(request, response) {

	function parseUrl(url) {
		var isHttp = url.indexOf(HTTP_FORMAT) != -1;
		var isHttps = url.indexOf(HTTPS_FORMAT) != -1;

		var urlWithoutProtocol = ''
		var protocol = ''
		if(isHttp) {
			urlWithoutProtocol = url.split(HTTP_FORMAT)[1]
			protocol = HTTP_FORMAT;
		} else if(isHttps) {
			urlWithoutProtocol = url.split(HTTPS_FORMAT)[1]
			protocol = HTTPS_FORMAT;
		} else {
			throw 'fodeu nao tem procolo';
		}
		
		var restWithSlashes = ''
		var mangaName = '';
		var chapter = '';

		var domainAndRest = urlWithoutProtocol.split('/');

		var elements = ['domain', 'mangaName', 'chapter'];
		var resultElements = [];


		var result = {protocol}

		domainAndRest.forEach((str, i) => {
			result[elements[i]] = str
		})

		domainAndRest.shift();
		var rest = domainAndRest;
		var restWithSlashes = rest.join('/');
		result.restWithSlashes = restWithSlashes;

		return result;
	}

	function errorHandler(err, res, done) {
		if(err) {
			console.log(err)
			done()
			response.sendStatus(500);
			return;
		}
	}

	function writeJsonOnResponse(json) {
		response.setHeader('Content-Type', 'application/json');
		response.send(JSON.stringify(json, null, 3));
	}

	var crawler = new Crawler({
		maxConnections: 10,
		rateLimit: 1000,
		callback: function(err, res, done) {
			errorHandler(err, res, done);

			var $ = res.$;

			var chapters = []
			var chapterLinks = $('[href]');
			chapterLinks.each((i, el) => {
				var href = el.attribs.href;
				if(href.indexOf(result.mangaName) != -1) {
					var resultStr = result.protocol + result.domain;
					var partes = href.split('/')
					var chapterName = partes[partes.length - 1]
					if(href.indexOf('/') == 0) {
						resultStr = resultStr + href;
					} else {
						resultStr = resultStr + '/' + href;
					}
					chapters.push({'chapterName': chapterName, 'source': resultStr});
				}
			})

			chapters.sort(function (a, b) {
				var splitA = a.source.split('/');
				var splitB = b.source.split('/');

				var chapterNumA = Number(splitA[splitA.length - 1])
				var chapterNumB = Number(splitB[splitB.length - 1])

				if (chapterNumA > chapterNumB) {
			    return 1;
			  }
			  if (chapterNumA < chapterNumB) {
			    return -1;
			  }
			  return 0;
			});

			var genres = []
			$('.genretags').map((i, el) => {
				if(el && el.firstChild && el.firstChild.nodeValue) {
					return el.firstChild.nodeValue;
				}
			}).each((i, e) => {
				genres.push({genre: e});
			});

			var authors = [];
			var tdAuthor = $('td').filter((i, el) => {
				if($(el).text()) {
					return $(el).text().toLowerCase().indexOf('author') != -1;
				}
				return false;
			})
			var potentialNames = $(tdAuthor).closest('tr').find('td').filter((i, el) => {
				if($(el).text()) {
					return $(el).text().toLowerCase().indexOf('author') == -1;
				}
				return false;
			});
			potentialNames.map((i, td) => {
				return $(td).text();
			}).each((i, e) => {
				authors.push({name: e});
			});

			var json = {
				'name': result.mangaName,
				'authors': authors,
				'genres': genres,
				'mangaChapters': chapters
			}

			done()
			writeJsonOnResponse(json);
		}
	})

	var url = request.query['url'];
	var mangaName = request.query['mangaName'];
	var result = parseUrl(url);

	crawler.queue(url);
}

app.get('/mangaChapters', mangaChapters);

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})
