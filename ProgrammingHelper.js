const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const child_process = require('child_process');

client.login('MzAyOTI5MjcxMTU0ODAyNjg4.DRSBPA.EBz8dKfI6d9uKI0eYGHYUQDhl28');

var currentFunction = -1;

client.on('messageReactionAdd', function(messageReaction, user) {
    var message = messageReaction.message;
    if (!message.author.bot) {
        if(message.content[0] === '`' && message.content[message.content.length - 1] === '`') {
            var stripped = message.content.slice(message.content.indexOf('\n'));
            stripped = stripped.slice(0, stripped.indexOf('```'));

            var type = message.content.slice(0, message.content.indexOf('\n')).trim();
            type = type.replace(/`/g, '');

            if (type === "js") {
                message.channel.send(new Function(stripped)());
            } else if (type === "cpp") {
                var cppFilePath = '/Users/goatgoose/W/DiscordProgrammingHelper/cppFunc.cpp';
                fs.writeFileSync(cppFilePath,
                    "#include <iostream>\n" +
                    "using namespace std;\n" +
                    "int main() {\n" +
                    stripped + "\n" +
                    "return 0;\n" +
                    "}");

                var compiler = child_process.spawn('g++', ['-Wall', '-Wno-c++11-extensions', cppFilePath, '-o', '/Users/goatgoose/W/DiscordProgrammingHelper/cppFunc']);

                compiler.stderr.on('data', function (comp_stdout) {
                    message.channel.send(comp_stdout.toString().trim());
                });

                compiler.on('close', function (code) {
                    if (code !== 1) {
                        currentFunction = child_process.spawn('/Users/goatgoose/W/DiscordProgrammingHelper/cppFunc');
                        currentFunction.stdout.on('data', function (stdout) {
                            var out = stdout.toString().trim();
                            message.channel.send(out);
                        });

                        currentFunction.on('close', function (code) {
                            currentFunction = -1;
                        });
                    }
                });
            } else if (type === "c") {
                var cFilePath = '/Users/goatgoose/W/DiscordProgrammingHelper/c.c';
                fs.writeFileSync(cFilePath,
                    "#include <stdio.h>\n" +
                    "#include <stdlib.h>\n" +
                    "int main() {\n" +
                    stripped + "\n" +
                    "return 0;\n" +
                    "}");

                var compiler = child_process.spawn('gcc', ['-Wall', cFilePath, '-o', '/Users/goatgoose/W/DiscordProgrammingHelper/c']);

                compiler.stderr.on('data', function(comp_stdout) {
                   message.channel.send(comp_stdout.toString().trim());
                });

                compiler.on('close', function(code) {
                    if (code !== 1) {
                        currentFunction = child_process.spawn('/Users/goatgoose/W/DiscordProgrammingHelper/c');
                        currentFunction.stdout.on('data', function (stdout) {
                            var out = stdout.toString().trim();
                            message.channel.send(out);
                        });

                        currentFunction.on('close', function (code) {
                            currentFunction = -1;
                        });
                    }
                });

            } else if (type === "py") {
                var pyFilePath = '/Users/goatgoose/W/DiscordProgrammingHelper/py.py';
                fs.writeFileSync(pyFilePath, stripped);

                currentFunction = child_process.spawn('python', ['/Users/goatgoose/W/DiscordProgrammingHelper/py.py']);

                currentFunction.stdout.on('data', function(stdout) {
                    var out = stdout.toString().trim();
                    message.channel.send(out);
                });

                currentFunction.on('close', function(code) {
                    currentFunction = -1;
                });
            } else {
                message.channel.send("language not supported");
            }
        }
    }
});

client.on('message', function(message) {
    if (!message.author.bot) {
        if (currentFunction !== -1) {
            currentFunction.stdin.write(message.content + "\n");
        }
    }
});