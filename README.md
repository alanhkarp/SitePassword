### Overview

It's too hard for you to remember a strong password for every account you use. Password managers take care of this problem for you. Most of them store your passwords in encrypted form, either on your machine or in the cloud.

SitePassword is different. Instead of storing your passwords, it calculates them from a single super password and your nickname and user name for the account. That means you can usually get your password if you remember those three things. (Some web pages require additional settings.) SitePassword automatically saves your settings, so you don't have to remember them.

The <img src="images/instructionsopen.png" style="width: 16px; height: 16px; vertical-align: middle;"> icon opens the instructions, and the <img src="images/instructionsclose.bmp" style="width: 16px; height: 16px; vertical-align: middle;"> icon closes them.

### Using the Extension

After you install the Chrome extension and visit a page with a login form, you'll see that the password field tells you to _Click SitePassword_. When you click on the SitePassword icon <img src="images/icon128.png" style="width: 16px; height: 16px; vertical-align: middle;">, you'll see a form with the domain name field filled in. Enter your super password, an easy to remember nickname for the account, and your user name for the account. You will see your username being filled in and your site password being calculated as you type.

Mouse over to the login form's password field, which now should tell you to _Click here for password_. Click, and your password gets filled in. When you return to the same web page on any machine that you synchronize bookmarks with and that has the extenstion installed, you'll see your user name filled in and instructions to _Click here for password_. Click, and your password gets filled in.

You will have to enter your super password each time you start your browser. That's because SitePassword never stores your super password; it only remembers it for the duration of your browser session. If your settings aren't there when you think they should be, reloading the page with the login form will solve the problem.

### The Domain Name

The domain name is associated with the settings for this account. It is also the name of a bookmark in the SitePasswordData bookmark folder. That's the bookmark you can use to get your settings when you're on a machine that doesn't have the SitePassword extension installed.

You may have more than one domain name for a given account because some web sites use more than one domain name for logging into the same account. You'll get the same password for all of the domain names as long as they are all associated with the same nickname.

### Your Super Password

You should choose a strong super password, one with upper and lower case letters, numbers, and special characters. The stronger the better. The reason is simple. A bad guy who knows one site password and can guess your nickname and user name for that account can start guessing super passwords. You want to make that job has hard as you can.

You can protect yourself further by using different super passwords for different kinds of accounts. You could have one that you use for banking, another for subscriptions, and a third for sites you find sketchy.

SitePassword doesn't prevent you from using a weak super password, but it does warn you. There is a strength indicator directly above the super password field. It uses a meter and color to let you know how strong your super password is. The tooltip tells you how long it would take a determined adversary to guess your super password.

You'll notice that your super password is not usually marked Strong until it is longer than a site password marked Strong. That's because the super password is something you can remember, while the site password is effectively a random string of characters, which is less guessable.

SitePassword cannot retrieve your super password. You should make sure it's something you won't easily forget. You might even want to write it down and keep the copy in a secure place.

### Your Site Nickname

You refer to an account by assigning it a nickname that should be easy to remember, such as 'amazon' for amazon.com, but it doesn't have to be that simple. For example, you might want to append the year if you must change your password annually.

[Additional settings](#settingsinfo), such as the site password length and whether your site password contains special characters are associated with this nickname.

You [change a site password](#changeinfo) by changing the nickname. All your settings will then be associated with the new nickname.

### Your User Name

Your user name is the name you use to log in to the account. It is associated with the nickname for the account and is used to calculate your site password. That means you can only have a single user name for a given nickname. If you want to use different user names for the same site, follow the instructions for [Shared Machines](#sharedinfo).

SitePassword will attempt to fill in the userid field of a login form. If you don't see it, one of a few things happened.

1.  You never provided your settings for this domain name.

    * This is the first time you've used SitePassword for this account.
    * This is a different domain name for logging into the same account.
    * You are at a fake site that is trying to steal your password.

3.  SitePassword incorrectly guessed the location of the userid field.
4.  SitePassword couldn't find the userid field.

In the last two cases, you'll have to fill in your userid manually, which you can do by copying it to the clipboard using the <img src="images/clipboard.png" style="width: 16px; height: 16px; vertical-align: middle;"> icon in the userid field.

### Your Site Password

You only need to open SitePassword to enter your super password, to set up a new site, or when you have to paste your site password. Most of the time, you can just click on the login form's password field.

SitePassword could generate a weak site password just by chance. To let you know that has happened, it uses the same strength meter that appears above your super password to tell you how strong your site password is. A tooltip tells you how long it would take a determined adversary to guess your site password.

When the generated password can't be used, say if you've been given one that you're not allowed to change, SitePassword can remember a password you provide. It is stored in your settings encrypted with the computed password for the site as a key. That means you must fill in the form before entering your password. After you fill in the form, open the settings by clicking and click the _Provide your own site password_ check box. You can then enter your password into the site password field.

You can also get your passwords without the extension. Go to [https://sitepassword.info](https://sitepassword.info) and fill in the form.

### Input Field Menus

Each of the input fields has a menu that shows up when you mouse over (or tap on a touchscreen) the 3 dots in the right side of the field (<img src="images/3bluedots.png" style="width: 16px; height: 16px; vertical-align: middle;">). Each field has a particular set of menu items. If an icon is grayed out, that function is not available for that field. For example, you can't show your super password if the field is empty.

<img src="images/help.png" style="width: 16px; height: 16px; vertical-align: middle;">   Every field has a help option, which provides a brief summary of the information provided in these Instructions.

<img src="images/forget.png" style="width: 16px; height: 16px; vertical-align: middle;">   The domain name, sitename, and username fields have a Forget option. For example, if you click this icon in the site nickname field, you will be given the opportunity to permanently forget the settings for all domain names associated with that site nickname.

<img src="images/clipboard.png" style="width: 16px; height: 16px; vertical-align: middle;">   The username and site password fields have a Copy option, which copies the contents of the field to the clipboard.

<img src="images/show.png" style="width: 16px; height: 16px; vertical-align: middle;">   <img src="images/hide.png" style="width: 16px; height: 16px; vertical-align: middle;">   The super and site password fields give you the option of showing or hiding the contents of the field.

### Additional Settings

The settings panel is divided into three sections. The first section is about your super and site passwords. The second section controls how SitePassword computes your site password. The third section lets you download your settings and export your passwords. Click on the <img src="images/gear.png" style="width: 16px; height: 16px; vertical-align: middle;"> icon to open the settings panel and the <img src="images/gear2.png" style="width: 16px; height: 16px; vertical-align: middle;"> icon to close it.

The top section of the settings panel has three settings related to your super and site passwords.

Unlike most password managers that calculate your password, SitePassword gives you the option to provide your own. This is useful if you have a password that you can't change, such as one provided by your employer. You can also use this option if SitePassword can't compute a password acceptable by the site.

The password you provide is encrypted with the computed site password as a key. That means you must fill in the form before entering your password. After you fill in the form, open the settings and check the _Provide your own site password_ check box. You'll then be able to enter your password into the site password field.

You normally leave your super password in the form, but you might not want to do that on a shared machine. Check the _Clear super password on use_ to clear your super password every time you use the calculated site password. You'll have to enter your super password every time you use SitePassword.

Your site password is not hidden by default. Surprisingly, people develop the ability to recognize their site passwords, allowing them detect typos when re-entering their super passwords. Check the _Hide site password by default_ button to hide it.

The next section controls how SitePassword computes your site password and is explained in [Computing an Acceptable Password](#acceptableinfo).

The _Download site data_ button is explained in [Downloading Your Settings](#downloadinfo), and the _Export passwords_ button, in [Exporting Your Passwords](#exportinfo).

### Computing an acceptable password

Some web sites have strict password rules, how long it must be, if it must contain upper case or lower case letters, numbers, or special characters, including restrictions on which special characters are allowed.

If you run into a site that doesn't accept the calculated password, click <img src="images/gear.png" style="width: 16px; height: 16px; vertical-align: middle;"> and change the appropriate menu entries. SitePassword was tested on hundreds of web sites to make sure it can almost always compute a valid password.

The defaults were chosen because SitePassword can calculate a password that is acceptable to most sites with them. You can change these settings if you run into a site that doesn't accept the calculated password.

Although these settings produce valid passwords for most sites, you might feel more comfortable generating stronger site passwords by making them longer or by including special characters. Click _Save as default_ to make these settings the default for all new accounts.

### Changing a Site Password

Some sites make you change your password periodically. SitePassword makes that easy. Just change your nickname for the account. For example, if your current nickname is _MyBank1_, and they make you change your password, you could change the nickname to _MyBank2_. Your new site password will be completely different from the old one.

### Using the Clipboard

There are two times when you will use the clipboard. Although SitePassword finds the password field on a large number of web sites, there are likely some where it won't. Your first clue that happened is that you don't see either _Click here for password_ or _Click SitePassword_ in the password field. You'll know for sure that happened if neither of them shows up as a tooltip after holding your mouse over the login form's password field for a couple of seconds. In that case, click on the SitePassword icon <img src="images/icon128.png" style="width: 16px; height: 16px; vertical-align: middle;"> and copy your site password to the clipboard by clicking on <img src="images/clipboard.png" style="width: 16px; height: 16px; vertical-align: middle;">.

The other time you'll use the clipboard is on pages that have more than one password field, such as those for creating an account or changing your password. In those cases, you may see instructions to _Paste your password here_. Clicking on the SitePassword icon and then the clipboard icon in the site password field will put your site password on the clipboard.

Leaving your site password on the clipboard for any length of time can be dangerous. SitePassword will alert you to this danger by changing its icon to <img src="images/icon128pw.png" style="width: 16px; height: 16px; vertical-align: middle;"> when you use the clipboard icon. You can always clear the clipbord and reset the warning by using the SitePassword _Clear Clipboard_ button or by copying something else to the clipboard. (These steps only clear the top item if the clipboard provides a stack of items.)

### Phishing Warning

SitePassword includes an antiphishing feature. If you try to use the same nickname for another domain name, you will get a big, scary warning. It's telling you that you may be at a site spoofing the one you think you are at.

Unfortunately, you will also see this warning when you are not being tricked. Many websites have several different login pages for the same account. So, when you see the warning, check the domain name in the warning message to make sure it's a login page for the account you think it is.

### Synchronizing across Your Machines

If you go to the same login page on a different machine that you synchronize bookmarks with, you'll see your user name for the account filled in for you. That's because the extension stores your settings in a bookmark folder called _SitePasswordData_. The extension uses the bookmark named CommonSettings for its own use. The bookmarks with domain names for titles can be used at [https://sitepassword.info](https://sitepassword.info) .

**You must turn on synchronization in your browser to use this feature.**

If you go to the same login page on a different machine that you synchronize with, you'll see your user name for the account filled in for you. That's because SitePassword uses the browser to synchronize your settings.

### Shared Machines

Many households have one machine shared by everybody. It's likely that everyone uses the same user name and password for certain accounts, such as streaming services. It's also likely that those people use their individual user names and passwords for other accounts, such as social media.

SitePassword accomodates those uses with a feature provided by your browser called _profiles_. Simply create one profile for the shared account and one for each individual.

### Downloading Your Settings

There is a _Download Site Data_ button at the bottom of the popup window after you click <img src="images/gear.png" style="width: 16px; height: 16px; vertical-align: middle;">. Clicking this button lets you save your settings in a file you can reference if you need to look them up. All settings created on machines you synchronize bookmarks with are included.

### Exporting Your Passwords

There may come a time when you want to use a different password manager. In that case you can use the _Export passwords_ button at the bottom of the popup window after you click <img src="images/gear.png" style="width: 16px; height: 16px; vertical-align: middle;">. Clicking this button creates a file with your passwords. You can see a readable form of the data in the file by opening it in a spreadsheet.

**Be very careful with this file.** Completely delete it from your machine, including emptying the trash, after you use it. If you don't, anyone who gets access to your machine can get your passwords.

### The Extension and the Web Page

There will be times when you are on a device that doesn't have SitePassword installed, such as at a friend's house or on your mobile device. You can still get your passwords by going to [https://sitepassword.info](https://sitepassword.info) or [the page on Github](https://alanhkarp.github.io/SitePasswordWeb/).

If you have synched your bookmarks to the device you are using, you can get your settings for the site by clicking on the appropriate bookmark to open the SitePassword web page, or you can paste the appropriate bookmark into the form if the page is already open.

See the instructions on the [https://sitepassword.info](https://sitepassword.info) web page for more information.

There will be times when you are on a device that doesn't have SitePassword installed, such as at a friend's house or on your mobile device. You can still get your passwords by going to [https://sitepassword.info](https://sitepassword.info) or [the page on Github](https://github.com/alanhkarp/SitePasswordWeb).

See the instructions on the [https://sitepassword.info](https://sitepassword.info) web page for more information.

### Source Code

If you are worried that SitePassword might go away, you can download the source code for the extension from the [SitePassword](https://github.com/alanhkarp/SitePassword) project and that of the web page version from the [SitePasswordWeb](https://github.com/alanhkarp/SitePasswordWeb) project. (For historical reasons, these are separate projects with a lot of duplicated code.)

### Developers

The SitePassword extension can be installed for Firefox, Safari, and most Chromium browsers using the code here. (Testing is sparse on Firefox and nearly non-existent on Safari.) Simply rename the appropriate manifest file to manifest.json, and install the extension using the mechanism provided by your browser.

You may find a need to debug the extension. The service worker, bg.js, and the content script, findpw.js, work normally, but the popup, ssp.js, won't stop at breakpoints hit early in its startup on Chrome. Setting the constant \*debugMode\* to true will make the popup stop at a \*debugger\* statement early in the load process.

A number of tests are included with the distribution. In keeping with the philosophy of avoiding dependencies, the tests don't use any frameworks. To run the tests, edit bg.js and set the constant \*testMode\* to true. Then reload the extension, go to a new page, and Inspect the popup. You'll get an alert that tests are running to make it harder for you to forget to turn off testing. Test results appear on the console.

### Voluntary Payment

If you like SitePassword, please make a contribution to the [Nancy Lee Hurtt '70 Maryland Promise Scholarship](https://giving.umd.edu/giving/fund.php?name=nancy-lee-hurtt-70-maryland-promise-scholarship) or your favorite charity.