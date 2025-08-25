import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:resize/resize.dart';

///WhatsApp's chat bubble type
///
///chat bubble color can be customized using [color]
///chat bubble tail can be customized  using [tail]
///chat bubble display message can be changed using [text]
///[text] is the only required parameter
///message sender can be changed using [isSender]
///chat bubble [TextStyle] can be customized using [textStyle]

class BubbleSpecialOne extends StatelessWidget {
  final bool isSender;
  final String text;
  final RichText? richText;
  final bool tail;
  final Color color;
  final bool sent;
  final bool delivered;
  final bool seen;
  final TextStyle textStyle;
  final void Function()? onLongPress;
  final BoxConstraints? constraints;

  const BubbleSpecialOne({
    super.key,
    this.isSender = true,
    this.constraints,
    required this.text,
    this.richText,
    this.color = Colors.white70,
    this.tail = true,
    this.sent = false,
    this.delivered = false,
    this.seen = false,
    this.textStyle = const TextStyle(
      color: Colors.black87,
      fontSize: 16,
    ),
    this.onLongPress,
  });

  ///chat bubble builder method
  @override
  Widget build(BuildContext context) {
    bool stateTick = false;
    Icon? stateIcon;
    Offset tapPosition = Offset.zero;
    if (sent) {
      stateTick = true;
      stateIcon = const Icon(
        Icons.done,
        size: 18,
        color: Color(0xFF97AD8E),
      );
    }
    if (delivered) {
      stateTick = true;
      stateIcon = const Icon(
        Icons.done_all,
        size: 18,
        color: Color(0xFF97AD8E),
      );
    }
    if (seen) {
      stateTick = true;
      stateIcon = Icon(
        Icons.done_all,
        size: 18,
        color: Color(0xFF92DEDA),
      );
    }

    return Align(
      alignment: isSender ? Alignment.topRight : Alignment.topLeft,
      child: GestureDetector(
        onTapDown: (TapDownDetails details) {
          tapPosition = details.globalPosition;
        },
        onLongPress: () {
          showMenu(
            context: context,
            position: RelativeRect.fromLTRB(
              tapPosition.dx, // Left
              tapPosition.dy, // Top
              tapPosition.dx, // Right
              tapPosition.dy, // Bottom
            ),
            items: [
              PopupMenuItem(
                padding: const EdgeInsets.all(0),
                height: 22.h,
                child: Row(
                  children: [
                    SizedBox(width: 5.0.w),
                    Icon(
                      Icons.copy,
                      size: 20.0.h,
                    ),
                    Text(
                      'Copy',
                      style: TextStyle(
                        fontSize: 16.0.sp,
                      ),
                    ),
                  ],
                ),
                onTap: () {
                  Clipboard.setData(ClipboardData(text: text));
                },
              ),
            ],
          );
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          child: CustomPaint(
            painter: SpecialChatBubbleOne(
                color: color,
                alignment: isSender ? Alignment.topRight : Alignment.topLeft,
                tail: tail),
            child: Container(
              constraints: constraints ??
                  BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * .7,
                  ),
              margin: isSender
                  ? stateTick
                      ? EdgeInsets.fromLTRB(7, 7, 14, 7)
                      : EdgeInsets.fromLTRB(7, 7, 17, 7)
                  : EdgeInsets.fromLTRB(17, 7, 7, 7),
              child: Stack(
                children: <Widget>[
                  Padding(
                    padding: stateTick
                        ? EdgeInsets.only(right: 20)
                        : EdgeInsets.symmetric(vertical: 0, horizontal: 0),
                    child: richText ??
                        MarkdownBody(
                          data: text,
                          styleSheet: MarkdownStyleSheet(textAlign: WrapAlignment.start),
                          // style: textStyle,
                          // textAlign: TextAlign.left,
                        ),
                  ),
                  stateIcon != null && stateTick
                      ? Positioned(
                          bottom: 0,
                          right: 0,
                          child: stateIcon,
                        )
                      : SizedBox(
                          width: 1,
                        ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

///custom painter use to create the shape of the chat bubble
///
/// [color],[alignment] and [tail] can be changed

class SpecialChatBubbleOne extends CustomPainter {
  final Color color;
  final Alignment alignment;
  final bool tail;

  SpecialChatBubbleOne({
    required this.color,
    required this.alignment,
    required this.tail,
  });

  final double _radius = 10.0;
  final double _x = 10.0;

  @override
  void paint(Canvas canvas, Size size) {
    if (alignment == Alignment.topRight) {
      if (tail) {
        canvas.drawRRect(
            RRect.fromLTRBAndCorners(
              0,
              0,
              size.width - _x,
              size.height,
              bottomLeft: Radius.circular(_radius),
              bottomRight: Radius.circular(_radius),
              topLeft: Radius.circular(_radius),
            ),
            Paint()
              ..color = color
              ..style = PaintingStyle.fill);
        var path = Path();
        path.moveTo(size.width - _x, 0);
        path.lineTo(size.width - _x, 10);
        path.lineTo(size.width, 0);
        canvas.clipPath(path);
        canvas.drawRRect(
            RRect.fromLTRBAndCorners(
              size.width - _x,
              0.0,
              size.width,
              size.height,
              topRight: Radius.circular(3),
            ),
            Paint()
              ..color = color
              ..style = PaintingStyle.fill);
      } else {
        canvas.drawRRect(
            RRect.fromLTRBAndCorners(
              0,
              0,
              size.width - _x,
              size.height,
              bottomLeft: Radius.circular(_radius),
              bottomRight: Radius.circular(_radius),
              topLeft: Radius.circular(_radius),
              topRight: Radius.circular(_radius),
            ),
            Paint()
              ..color = color
              ..style = PaintingStyle.fill);
      }
    } else {
      if (tail) {
        canvas.drawRRect(
            RRect.fromLTRBAndCorners(
              _x,
              0,
              size.width,
              size.height,
              bottomRight: Radius.circular(_radius),
              topRight: Radius.circular(_radius),
              bottomLeft: Radius.circular(_radius),
            ),
            Paint()
              ..color = color
              ..style = PaintingStyle.fill);
        var path = Path();
        path.moveTo(_x, 0);
        path.lineTo(_x, 10);
        path.lineTo(0, 0);
        canvas.clipPath(path);
        canvas.drawRRect(
            RRect.fromLTRBAndCorners(
              0,
              0.0,
              _x,
              size.height,
              topLeft: Radius.circular(3),
            ),
            Paint()
              ..color = color
              ..style = PaintingStyle.fill);
      } else {
        canvas.drawRRect(
            RRect.fromLTRBAndCorners(
              _x,
              0,
              size.width,
              size.height,
              bottomRight: Radius.circular(_radius),
              topRight: Radius.circular(_radius),
              bottomLeft: Radius.circular(_radius),
              topLeft: Radius.circular(_radius),
            ),
            Paint()
              ..color = color
              ..style = PaintingStyle.fill);
      }
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) {
    return true;
  }
}
