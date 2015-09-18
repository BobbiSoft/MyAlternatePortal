/**
 * Created by SecretLabs on 10.09.15.
 */

var Route = require('./route');
var multer = require('multer');
var converter = require('../converter');

module.exports = function SaveSchedule(models) {
    var self = this;

    Route.extend(SaveSchedule);
    Route.call(this, 'POST', '/save-schedule');

    self.setup = function (app) {
        app.use(multer().single('schedule-file'));
    };

    self.addHandler(function (req, res) {
        res.setHeader('Content-Type', 'application/json');
        if (typeof req.session.logined == 'undefined') {
            res.status(403).send('Permissions denied');
            return;
        }

        var faculty, course, group;
        try {
            faculty = checkVar(req.body.faculty);
            course = checkVar(req.body.course);
            group = checkVar(req.body.group);
        } catch (error) {
            res.status(400).send('Query parameters wrong: ' + error.message);
            return;
        }

        var facultyDB, courseDB, groupDB;
        saveFaculty();

        function saveFaculty() {
            if (faculty.type === 'new') {
                facultyDB = new models.Faculty({name: faculty.val});
                facultyDB.save(function () {
                    saveCourse();
                });
            } else {
                models.Faculty.findById(faculty.val, function (err, fac) {
                    facultyDB = fac;
                    saveCourse();
                });
            }
        }

        function saveCourse() {
            if (course.type === 'new' && facultyDB) {
                courseDB = new models.Course({
                    name: course.val,
                    facultyId: facultyDB.id
                });
                courseDB.save(function () {
                    saveGroup();
                });
            } else {
                models.Course.findById(course.val, function (err, cou) {
                    courseDB = cou;
                    saveGroup();
                });
            }
        }

        function saveGroup() {
            if (group.type === 'new' && courseDB) {
                groupDB = new models.Group({
                    name: group.val,
                    facultyId: facultyDB.id,
                    courseId: courseDB.id
                });
                groupDB.save(function () {
                    convert();
                });
            } else {
                models.Group.findById(group.val, function (err, gr) {
                    groupDB = gr;
                    convert();
                });
            }
        }

        function convert() {
            try {
                var weeks = converter(req.file);
                console.log('Selected', groupDB.id);
                weeks.forEach(function (week) {
                    week.groupId = groupDB.id;
                    //new models.Schedule(week).save();
                });
                res.send('{}');
            } catch (e) {
                console.log(e);
                res.status(422).send(e.message);
            }
        }

        function checkResult(err, result) {
            return !err && result && result.length > 0;
        }

        function checkVar(v) {
            v = JSON.parse(v);
            if (typeof v == 'undefined' || typeof v.val == 'undefined')
                throw new Error('Var ' + v + ' has wrong format');
            return v;
        }

    });

};
