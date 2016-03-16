Decks = new Mongo.Collection("decks")

if(Meteor.isServer){
	Meteor.publish("decks", function () {
    return Decks.find({
      $or: [
        { isPublic: {$eq: true} },
        { owner: this.userId }
      ]
    });
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("decks")
  console.log("User id: " + Meteor.userId())
  Template.body.helpers({
    decks: function(){
    	return(Decks.find({}))
    }
  });
  Template.body.events({
  	"submit .new-deck":function(event){
  		event.preventDefault();
  		var name = event.target.name.value;
  		var checked = event.target.checkbox.checked
  		Meteor.call("addDeck", name, checked)
  		event.target.name.value = "";
  	}
  });
  Template.deck.helpers({
  	isPublic: function(){
  		var deck = Decks.findOne(this._id)
  		return deck.isPublic
  	},
  	isOwner: function(){
  		return this.owner === Meteor.userId()
  	}
  });
  Template.deck.events({
  	"click .delete": function() {
  		Meteor.call("deleteDeck", this._id)
  	}
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
});

}

Meteor.methods({
  		addDeck: function (name, isPublic) {
  			Decks.insert({
  				name: name,
  				createdAt: new Date(),
  				owner: Meteor.userId(),
  				cards: new Array(),
  				isPublic: isPublic
  			});
  		},
  		deleteDeck: function (deckId) {
      		Decks.remove(deckId);
    	}
});
